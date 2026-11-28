import threading

from django.db import connection
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.exceptions import APIException

from core.testing import APITestBase, make_product, make_user
from orders import services
from orders.models import Order
from products.models import Product

ORDERS = reverse("order-list")


def action(pk, name):
    return reverse(f"order-{name}", args=[pk])


class OrderTestBase(APITestBase):
    def setUp(self):
        super().setUp()
        self.seller = make_user("seller@bmsce.ac.in", full_name="Seller")
        self.buyer = make_user("buyer@bmsce.ac.in", full_name="Buyer")
        self.stranger = make_user("stranger@bmsce.ac.in", full_name="Stranger")
        self.product = make_product(self.seller)

    def place(self, user=None, product=None):
        self.login(user or self.buyer)
        return self.client.post(ORDERS, {"product": (product or self.product).pk, "note": "After 2 PM lab?"})


class OrderCreationTests(OrderTestBase):
    def test_place_order(self):
        res = self.place()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], "pending")
        self.assertEqual(res.data["total_price"], "450.00")
        self.assertEqual(res.data["seller"]["id"], self.seller.id)
        self.assertEqual(res.data["meeting_point"], self.product.location)
        self.assertEqual(res.data["role"], "buyer")
        self.assertTrue(res.data["can_cancel"])

    def test_requires_authentication(self):
        self.assertEqual(self.client.post(ORDERS, {"product": self.product.pk}).status_code, 401)

    def test_cannot_buy_own_product(self):
        res = self.place(user=self.seller)
        self.assertEqual(res.status_code, 403)
        self.assertIn("own product", res.data["detail"])

    def test_cannot_order_unavailable_product(self):
        self.product.status = Product.Status.SOLD
        self.product.save()
        self.assertEqual(self.place().status_code, 409)

    def test_no_duplicate_active_orders(self):
        self.assertEqual(self.place().status_code, 201)
        res = self.place()
        self.assertEqual(res.status_code, 409)
        self.assertEqual(Order.objects.count(), 1)

    def test_invalid_input(self):
        self.login(self.buyer)
        self.assertEqual(self.client.post(ORDERS, {}).status_code, 400)
        self.assertEqual(self.client.post(ORDERS, {"product": 99999}).status_code, 404)
        self.assertEqual(self.client.post(ORDERS, {"product": self.product.pk, "quantity": 3}).status_code, 400)


class OrderLifecycleTests(OrderTestBase):
    def setUp(self):
        super().setUp()
        self.order_id = self.place().data["id"]

    def test_only_participants_can_see_order(self):
        self.login(self.stranger)
        self.assertEqual(self.client.get(reverse("order-detail", args=[self.order_id])).status_code, 404)
        self.assertEqual(self.client.post(action(self.order_id, "accept")).status_code, 404)
        self.login(self.seller)
        self.assertEqual(self.client.get(reverse("order-detail", args=[self.order_id])).status_code, 200)

    def test_buyer_and_seller_lists(self):
        self.login(self.buyer)
        self.assertEqual(self.client.get(reverse("order-my-orders")).data["count"], 1)
        self.assertEqual(self.client.get(reverse("order-seller-orders")).data["count"], 0)
        self.login(self.seller)
        res = self.client.get(reverse("order-seller-orders"))
        self.assertEqual(res.data["count"], 1)
        self.assertTrue(res.data["results"][0]["can_accept"])
        self.assertEqual(self.client.get(f"{ORDERS}?role=seller&status=pending").data["count"], 1)

    def test_accept_reserves_product_and_rejects_other_requests(self):
        other_buyer = make_user("b2@bmsce.ac.in")
        other_order = self.place(user=other_buyer).data["id"]

        self.login(self.buyer)
        self.assertEqual(self.client.post(action(self.order_id, "accept")).status_code, 403)  # buyer can't accept

        self.login(self.seller)
        res = self.client.post(action(self.order_id, "accept"))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "accepted")
        self.product.refresh_from_db()
        self.assertEqual(self.product.status, "reserved")
        self.assertEqual(Order.objects.get(pk=other_order).status, "rejected")
        # Accepting twice is a conflict.
        self.assertEqual(self.client.post(action(self.order_id, "accept")).status_code, 409)
        # Nobody else can order the reserved product.
        self.assertEqual(self.place(user=self.stranger).status_code, 409)

    def test_reject(self):
        self.login(self.seller)
        self.assertEqual(self.client.post(action(self.order_id, "reject")).data["status"], "rejected")
        self.assertEqual(self.client.post(action(self.order_id, "complete")).status_code, 409)

    def test_buyer_cancels_accepted_order_and_item_becomes_available(self):
        self.login(self.seller)
        self.client.post(action(self.order_id, "accept"))
        self.assertEqual(self.client.post(action(self.order_id, "cancel")).status_code, 403)  # seller can't cancel
        self.login(self.buyer)
        res = self.client.post(action(self.order_id, "cancel"))
        self.assertEqual(res.data["status"], "cancelled")
        self.product.refresh_from_db()
        self.assertEqual(self.product.status, "available")

    def test_complete_marks_product_sold(self):
        self.login(self.seller)
        self.assertEqual(self.client.post(action(self.order_id, "complete")).status_code, 409)  # still pending
        self.client.post(action(self.order_id, "accept"))
        self.login(self.buyer)
        self.assertEqual(self.client.post(action(self.order_id, "complete")).status_code, 403)
        self.login(self.seller)
        res = self.client.post(action(self.order_id, "complete"))
        self.assertEqual(res.data["status"], "completed")
        self.product.refresh_from_db()
        self.assertEqual(self.product.status, "sold")
        self.login(self.buyer)
        self.assertEqual(self.client.post(action(self.order_id, "cancel")).status_code, 409)

    def test_order_history_survives_listing_deletion(self):
        self.login(self.buyer)
        self.client.post(action(self.order_id, "cancel"))
        self.product.delete()
        res = self.client.get(reverse("order-detail", args=[self.order_id]))
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["product"])
        self.assertEqual(res.data["product_title"], "Engineering Mathematics Textbook")


class ConcurrentOrderTests(TransactionTestCase):
    """Two sellers' clicks / two buyers racing must never double-sell an item (needs PostgreSQL)."""

    serialized_rollback = True  # keep the categories created by the data migration

    def run_in_threads(self, *callables):
        barrier = threading.Barrier(len(callables))
        results = [None] * len(callables)

        def runner(index, fn):
            try:
                barrier.wait()
                results[index] = fn()
            except Exception as exc:  # noqa: BLE001 – recorded and asserted on below
                results[index] = exc
            finally:
                connection.close()

        threads = [threading.Thread(target=runner, args=(i, fn)) for i, fn in enumerate(callables)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        return results

    def test_only_one_order_can_be_accepted(self):
        if connection.vendor != "postgresql":
            self.skipTest("Row locking requires PostgreSQL")
        seller = make_user("seller@bmsce.ac.in")
        product = make_product(seller)
        order_a = services.place_order(buyer=make_user("a@bmsce.ac.in"), product_id=product.pk)
        order_b = services.place_order(buyer=make_user("b@bmsce.ac.in"), product_id=product.pk)

        results = self.run_in_threads(
            lambda: services.accept_order(order_id=order_a.pk, user=seller),
            lambda: services.accept_order(order_id=order_b.pk, user=seller),
        )
        self.assertEqual(sum(isinstance(r, Order) for r in results), 1)
        loser = next(r for r in results if not isinstance(r, Order))
        # The loser gets a clean 409, never a database error such as a deadlock.
        self.assertIsInstance(loser, APIException, repr(loser))
        self.assertEqual(loser.status_code, 409)
        self.assertEqual(Order.objects.filter(status="accepted").count(), 1)
        product.refresh_from_db()
        self.assertEqual(product.status, "reserved")

    def test_same_buyer_double_submit_creates_one_order(self):
        if connection.vendor != "postgresql":
            self.skipTest("Row locking requires PostgreSQL")
        product = make_product(make_user("seller@bmsce.ac.in"))
        buyer = make_user("buyer@bmsce.ac.in")
        results = self.run_in_threads(
            lambda: services.place_order(buyer=buyer, product_id=product.pk),
            lambda: services.place_order(buyer=buyer, product_id=product.pk),
        )
        self.assertEqual(sum(isinstance(r, Order) for r in results), 1)
        loser = next(r for r in results if not isinstance(r, Order))
        self.assertIsInstance(loser, APIException, repr(loser))
        self.assertEqual(loser.status_code, 409)
        self.assertEqual(Order.objects.count(), 1)
