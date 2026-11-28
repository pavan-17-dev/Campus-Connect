import shutil
import tempfile
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status

from core.testing import APITestBase, image_file, make_admin, make_product, make_user
from orders.models import Order
from products.models import Product, ProductImage

MEDIA = tempfile.mkdtemp(prefix="cc-test-media-")
LIST = reverse("product-list")


def detail(pk):
    return reverse("product-detail", args=[pk])


@override_settings(MEDIA_ROOT=MEDIA)
class ProductTestBase(APITestBase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        super().setUp()
        self.seller = make_user("seller@bmsce.ac.in", full_name="Priya Nair")
        self.other = make_user("other@bmsce.ac.in", full_name="Rohan K")

    def valid_payload(self, **extra):
        data = {
            "title": "Casio fx-991ES Plus Calculator",
            "description": "Scientific calculator, allowed in exams, used for one semester only.",
            "price": "750",
            "original_price": "1295",
            "category": "electronics",
            "condition": "Like New",
            "location": "CSE Block",
        }
        data.update(extra)
        return data


class ProductCreateTests(ProductTestBase):
    def test_create_requires_authentication(self):
        self.assertEqual(self.client.post(LIST, self.valid_payload()).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_with_images_multipart(self):
        self.login(self.seller)
        data = self.valid_payload(uploaded_images=[image_file("a.jpg"), image_file("b.png", fmt="PNG")])
        res = self.client.post(LIST, data, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["seller"]["id"], self.seller.id)
        self.assertEqual(res.data["condition"], "like_new")
        self.assertEqual(res.data["status"], "available")
        self.assertEqual(res.data["campus"], self.seller.college)
        self.assertEqual(len(res.data["images"]), 2)
        self.assertTrue(res.data["images"][0]["image"].startswith("http"))

    def test_seller_comes_from_token_not_body(self):
        self.login(self.seller)
        res = self.client.post(LIST, self.valid_payload(seller=self.other.id))
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Product.objects.get(pk=res.data["id"]).seller, self.seller)

    def test_invalid_input(self):
        self.login(self.seller)
        cases = {
            "price": self.valid_payload(price="0"),
            "category": self.valid_payload(category="spaceships"),
            "condition": self.valid_payload(condition="Broken"),
            "title": self.valid_payload(title="abc"),
            "description": self.valid_payload(description="too short"),
            "original_price": self.valid_payload(original_price="100"),
        }
        for field, data in cases.items():
            with self.subTest(field=field):
                res = self.client.post(LIST, data)
                self.assertEqual(res.status_code, 400)
                self.assertIn(field, res.data["errors"])

    def test_rejects_non_image_and_oversized_files(self):
        self.login(self.seller)
        fake = SimpleUploadedFile("evil.jpg", b"<?php echo 'hi'; ?>", content_type="image/jpeg")
        res = self.client.post(LIST, self.valid_payload(uploaded_images=[fake]), format="multipart")
        self.assertEqual(res.status_code, 400)
        with self.settings(MAX_IMAGE_SIZE_MB=0):
            res = self.client.post(LIST, self.valid_payload(uploaded_images=[image_file()]), format="multipart")
        self.assertEqual(res.status_code, 400)
        self.assertIn("MB", res.data["detail"])
        gif = image_file("anim.gif", fmt="GIF")
        res = self.client.post(LIST, self.valid_payload(uploaded_images=[gif]), format="multipart")
        self.assertEqual(res.status_code, 400)

    @override_settings(MAX_IMAGES_PER_PRODUCT=2)
    def test_image_limit(self):
        self.login(self.seller)
        files = [image_file(f"{i}.jpg") for i in range(3)]
        res = self.client.post(LIST, self.valid_payload(uploaded_images=files), format="multipart")
        self.assertEqual(res.status_code, 400)
        self.assertIn("uploaded_images", res.data["errors"])


class ProductPermissionTests(ProductTestBase):
    def setUp(self):
        super().setUp()
        self.product = make_product(self.seller)

    def test_only_owner_can_update(self):
        self.login(self.other)
        self.assertEqual(self.client.patch(detail(self.product.pk), {"price": "1"}).status_code, 403)
        self.login(self.seller)
        res = self.client.patch(detail(self.product.pk), {"price": "399"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Decimal(res.data["price"]), Decimal("399"))

    def test_status_and_seller_are_read_only_in_normal_update(self):
        self.login(self.seller)
        self.client.patch(detail(self.product.pk), {"status": "sold", "is_featured": True})
        self.product.refresh_from_db()
        self.assertEqual(self.product.status, "available")
        self.assertFalse(self.product.is_featured)

    def test_only_owner_or_admin_can_delete(self):
        self.login(self.other)
        self.assertEqual(self.client.delete(detail(self.product.pk)).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.delete(detail(self.product.pk)).status_code, 401)
        self.login(self.seller)
        self.assertEqual(self.client.delete(detail(self.product.pk)).status_code, 204)
        other_product = make_product(self.other)
        self.login(make_admin())
        self.assertEqual(self.client.delete(detail(other_product.pk)).status_code, 204)

    def test_admin_cannot_edit_someone_elses_listing(self):
        self.login(make_admin())
        self.assertEqual(self.client.patch(detail(self.product.pk), {"price": "1"}).status_code, 403)

    def test_delete_blocked_while_order_active(self):
        Order.objects.create(buyer=self.other, seller=self.seller, product=self.product, product_title="x", unit_price=1, total_price=1)
        self.login(self.seller)
        res = self.client.delete(detail(self.product.pk))
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Product.objects.filter(pk=self.product.pk).exists())

    def test_upload_and_delete_images(self):
        url = reverse("product-images", args=[self.product.pk])
        self.login(self.other)
        self.assertEqual(self.client.post(url, {"images": [image_file()]}, format="multipart").status_code, 403)
        self.login(self.seller)
        res = self.client.post(url, {"images": [image_file(), image_file("2.jpg")]}, format="multipart")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(self.product.images.count(), 2)
        image_id = res.data[0]["id"]
        self.login(self.other)
        self.assertEqual(self.client.delete(reverse("product-delete-image", args=[self.product.pk, image_id])).status_code, 403)
        self.login(self.seller)
        self.assertEqual(self.client.delete(reverse("product-delete-image", args=[self.product.pk, image_id])).status_code, 204)
        self.assertFalse(ProductImage.objects.filter(pk=image_id).exists())

    def test_update_availability(self):
        url = reverse("product-update-status", args=[self.product.pk])
        self.login(self.other)
        self.assertEqual(self.client.patch(url, {"status": "sold"}).status_code, 403)
        self.login(self.seller)
        self.assertEqual(self.client.patch(url, {"status": "flying"}).status_code, 400)
        res = self.client.patch(url, {"status": "sold"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "sold")
        self.assertFalse(res.data["is_available"])

    def test_availability_locked_by_accepted_order(self):
        Order.objects.create(
            buyer=self.other, seller=self.seller, product=self.product, product_title="x", unit_price=1, total_price=1, status="accepted"
        )
        self.login(self.seller)
        res = self.client.patch(reverse("product-update-status", args=[self.product.pk]), {"status": "available"})
        self.assertEqual(res.status_code, 409)

    def test_report_listing(self):
        url = reverse("product-report", args=[self.product.pk])
        self.login(self.seller)
        self.assertEqual(self.client.post(url, {"reason": "spam"}).status_code, 400)  # own listing
        self.login(self.other)
        self.assertEqual(self.client.post(url, {"reason": "misleading", "details": "Wrong edition"}).status_code, 201)
        self.assertEqual(self.client.post(url, {"reason": "spam"}).status_code, 409)


class ProductListingTests(ProductTestBase):
    def setUp(self):
        super().setUp()
        self.book = make_product(self.seller, title="Data Structures Using C", price=Decimal("300"), condition="used")
        self.calc = make_product(
            self.seller, title="Casio Scientific Calculator", description="fx-991ES, perfect for exams and labs.",
            price=Decimal("750"), category_slug="electronics", condition="like_new",
        )
        self.laptop = make_product(
            self.other, title="Dell Inspiron Laptop", description="i5, 8GB RAM, great for coding projects.",
            price=Decimal("32000"), category_slug="electronics", status="sold",
        )

    def titles(self, url):
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        return [p["title"] for p in res.data["results"]]

    def test_public_list_is_paginated_and_hides_private_seller_data(self):
        res = self.client.get(LIST)
        self.assertEqual(res.data["count"], 3)
        seller = res.data["results"][0]["seller"]
        for private in ("email", "phone", "student_id"):
            self.assertNotIn(private, seller)

    def test_search_title_and_description(self):
        self.assertEqual(self.titles(f"{LIST}?search=casio"), ["Casio Scientific Calculator"])
        self.assertEqual(self.titles(f"{LIST}?search=coding"), ["Dell Inspiron Laptop"])

    def test_filters(self):
        self.assertCountEqual(self.titles(f"{LIST}?category=electronics"), ["Casio Scientific Calculator", "Dell Inspiron Laptop"])
        self.assertCountEqual(self.titles(f"{LIST}?category=books,electronics&available=true"), ["Data Structures Using C", "Casio Scientific Calculator"])
        self.assertEqual(self.titles(f"{LIST}?min_price=500&max_price=1000"), ["Casio Scientific Calculator"])
        self.assertEqual(self.titles(f"{LIST}?condition=Like New"), ["Casio Scientific Calculator"])
        self.assertEqual(self.titles(f"{LIST}?condition=used"), ["Data Structures Using C"])
        self.assertEqual(self.titles(f"{LIST}?available=false"), ["Dell Inspiron Laptop"])
        self.assertEqual(self.titles(f"{LIST}?status=sold"), ["Dell Inspiron Laptop"])
        self.assertEqual(self.titles(f"{LIST}?seller={self.other.id}"), ["Dell Inspiron Laptop"])

    def test_invalid_filter_value(self):
        res = self.client.get(f"{LIST}?min_price=abc")
        self.assertEqual(res.status_code, 400)

    def test_sorting(self):
        self.assertEqual(self.titles(f"{LIST}?ordering=price")[0], "Data Structures Using C")
        self.assertEqual(self.titles(f"{LIST}?ordering=-price")[0], "Dell Inspiron Laptop")
        self.assertEqual(self.titles(LIST)[0], "Dell Inspiron Laptop")  # newest first by default

    def test_products_of_inactive_sellers_are_hidden(self):
        self.other.is_active = False
        self.other.save()
        self.assertNotIn("Dell Inspiron Laptop", self.titles(LIST))

    def test_my_products(self):
        url = reverse("product-my-products")
        self.assertEqual(self.client.get(url).status_code, 401)
        self.login(self.other)
        self.assertEqual(self.titles(url), ["Dell Inspiron Laptop"])  # includes sold items

    def test_by_category_and_by_seller(self):
        self.assertCountEqual(
            self.titles(reverse("category-products", args=["electronics"])), ["Casio Scientific Calculator", "Dell Inspiron Laptop"]
        )
        self.assertEqual(self.client.get(reverse("category-products", args=["nope"])).status_code, 404)
        self.assertCountEqual(self.titles(reverse("seller-products", args=[self.seller.id])), ["Data Structures Using C", "Casio Scientific Calculator"])

    def test_categories_list_with_counts(self):
        res = self.client.get(reverse("category-list"))
        self.assertEqual(res.status_code, 200)
        counts = {c["slug"]: c["product_count"] for c in res.data}
        self.assertEqual(counts["electronics"], 2)
        self.assertIn("furniture", counts)

    def test_detail_featured_related_recommendations(self):
        res = self.client.get(detail(self.calc.pk))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["category_detail"]["slug"], "electronics")
        self.assertEqual(self.client.get(detail(999999)).status_code, 404)

        featured = self.client.get(reverse("product-featured"))
        self.assertTrue(all(p["is_available"] for p in featured.data))

        related = self.client.get(reverse("product-related", args=[self.book.pk]))
        self.assertNotIn(self.book.pk, [p["id"] for p in related.data])

        self.login(self.seller)
        recs = self.client.get(reverse("recommendations") + "?categories=electronics")
        self.assertEqual(recs.status_code, 200)
        self.assertTrue(all(p["seller"]["id"] != self.seller.id for p in recs.data))  # never your own items
