from django.urls import reverse

from core.testing import APITestBase, make_admin, make_product, make_user


class CoreTests(APITestBase):
    def test_health_check(self):
        res = self.client.get(reverse("health-check"))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "ok", "database": "ok"})

    def test_api_docs_available(self):
        self.assertEqual(self.client.get(reverse("schema")).status_code, 200)
        self.assertEqual(self.client.get(reverse("swagger-ui")).status_code, 200)

    def test_error_format_is_consistent(self):
        res = self.client.post(reverse("auth-login"), {})
        self.assertEqual(res.status_code, 400)
        self.assertIn("detail", res.data)
        self.assertIn("errors", res.data)
        res = self.client.get(reverse("auth-profile"))
        self.assertEqual(res.status_code, 401)
        self.assertIn("detail", res.data)

    def test_admin_stats_are_admin_only(self):
        student = make_user()
        make_product(student)
        self.login(student)
        self.assertEqual(self.client.get(reverse("admin-stats")).status_code, 403)
        self.login(make_admin())
        res = self.client.get(reverse("admin-stats"))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total_students"], 1)
        self.assertEqual(res.data["total_listings"], 1)
        self.assertIn("pending", res.data["orders"])

    def test_admin_report_moderation(self):
        seller, reporter = make_user(), make_user("r@bmsce.ac.in")
        product = make_product(seller)
        self.login(reporter)
        self.client.post(reverse("product-report", args=[product.pk]), {"reason": "spam"})
        self.assertEqual(self.client.get(reverse("admin-report-list")).status_code, 403)
        self.login(make_admin())
        reports = self.client.get(reverse("admin-report-list")).data["results"]
        self.assertEqual(len(reports), 1)
        res = self.client.patch(reverse("admin-report-detail", args=[reports[0]["id"]]), {"is_resolved": True})
        self.assertTrue(res.data["is_resolved"])
