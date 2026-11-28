from django.urls import reverse
from rest_framework import status

from core.testing import APITestBase, make_product, make_user
from messaging.models import Conversation, Message

SEND = reverse("message-send")
CONVERSATIONS = reverse("conversation-list")


class MessagingTests(APITestBase):
    def setUp(self):
        super().setUp()
        self.seller = make_user("seller@bmsce.ac.in", full_name="Seller")
        self.buyer = make_user("buyer@bmsce.ac.in", full_name="Buyer")
        self.stranger = make_user("stranger@bmsce.ac.in", full_name="Stranger")
        self.product = make_product(self.seller)

    def start(self):
        self.login(self.buyer)
        return self.client.post(CONVERSATIONS, {"product": self.product.pk})

    def test_requires_authentication(self):
        self.assertEqual(self.client.get(CONVERSATIONS).status_code, 401)
        self.assertEqual(self.client.post(SEND, {"receiver": self.seller.pk, "content": "hi"}).status_code, 401)

    def test_start_product_conversation_defaults_to_seller_and_is_reused(self):
        first = self.start()
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data["participant"]["id"], self.seller.id)
        self.assertEqual(first.data["product"]["id"], self.product.id)
        again = self.start()
        self.assertEqual(again.status_code, status.HTTP_200_OK)
        self.assertEqual(again.data["id"], first.data["id"])
        # The seller opening it from their side finds the same thread.
        self.login(self.seller)
        res = self.client.post(CONVERSATIONS, {"receiver": self.buyer.pk, "product": self.product.pk})
        self.assertEqual(res.data["id"], first.data["id"])

    def test_send_and_receive(self):
        self.login(self.buyer)
        res = self.client.post(SEND, {"product": self.product.pk, "content": "  Is this still available?  "})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["message"]["content"], "Is this still available?")
        self.assertTrue(res.data["message"]["is_mine"])
        conversation_id = res.data["conversation"]["id"]

        self.login(self.seller)
        listing = self.client.get(CONVERSATIONS).data["results"]
        self.assertEqual(listing[0]["unread_count"], 1)
        self.assertEqual(listing[0]["participant"]["name"], "Buyer")
        self.assertEqual(self.client.get(reverse("message-unread-count")).data["unread"], 1)

        reply = self.client.post(reverse("conversation-messages", args=[conversation_id]), {"content": "Yes!"})
        self.assertEqual(reply.status_code, 201)
        thread = self.client.get(reverse("conversation-messages", args=[conversation_id])).data
        self.assertEqual([m["content"] for m in thread["messages"]], ["Is this still available?", "Yes!"])
        self.assertEqual([m["is_mine"] for m in thread["messages"]], [False, True])

        marked = self.client.post(reverse("conversation-read", args=[conversation_id]))
        self.assertEqual(marked.data["marked_read"], 1)
        self.assertEqual(self.client.get(reverse("message-unread-count")).data["unread"], 0)

    def test_polling_with_after(self):
        conversation_id = self.start().data["id"]
        url = reverse("conversation-messages", args=[conversation_id])
        first = self.client.post(url, {"content": "one"}).data
        self.client.post(url, {"content": "two"})
        res = self.client.get(f"{url}?after={first['id']}")
        self.assertEqual([m["content"] for m in res.data["messages"]], ["two"])

    def test_non_participants_cannot_read_or_post(self):
        conversation_id = self.start().data["id"]
        self.client.post(reverse("conversation-messages", args=[conversation_id]), {"content": "private"})
        self.login(self.stranger)
        url = reverse("conversation-messages", args=[conversation_id])
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.post(url, {"content": "let me in"}).status_code, 404)
        self.assertEqual(self.client.post(reverse("conversation-read", args=[conversation_id])).status_code, 404)
        self.assertEqual(self.client.get(CONVERSATIONS).data["count"], 0)

    def test_cannot_spoof_sender(self):
        self.login(self.stranger)
        res = self.client.post(SEND, {"receiver": self.buyer.pk, "content": "hello", "sender": self.seller.pk})
        self.assertEqual(res.status_code, 201)
        message = Message.objects.get(pk=res.data["message"]["id"])
        self.assertEqual(message.sender, self.stranger)

    def test_product_messages_must_involve_the_seller(self):
        self.login(self.stranger)
        res = self.client.post(SEND, {"receiver": self.buyer.pk, "product": self.product.pk, "content": "hi"})
        self.assertEqual(res.status_code, 400)

    def test_invalid_messages(self):
        self.login(self.buyer)
        self.assertEqual(self.client.post(SEND, {"receiver": self.buyer.pk, "content": "me"}).status_code, 400)
        self.assertEqual(self.client.post(SEND, {"receiver": self.seller.pk, "content": "   "}).status_code, 400)
        self.assertEqual(self.client.post(SEND, {"receiver": self.seller.pk, "content": "x" * 2001}).status_code, 400)
        self.assertEqual(self.client.post(SEND, {"content": "who?"}).status_code, 400)
        self.assertEqual(self.client.post(SEND, {"receiver": 999999, "content": "hi"}).status_code, 404)
        self.assertEqual(Conversation.objects.count(), 0)  # nothing created for invalid input

    def test_inactive_user_cannot_receive(self):
        self.seller.is_active = False
        self.seller.save()
        self.login(self.buyer)
        self.assertEqual(self.client.post(SEND, {"receiver": self.seller.pk, "content": "hi"}).status_code, 404)
