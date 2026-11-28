import re
from unittest import mock

from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.throttling import SimpleRateThrottle

from accounts.models import User
from core.testing import PASSWORD, APITestBase, make_admin, make_user

REGISTER = reverse("auth-register")
LOGIN = reverse("auth-login")
PROFILE = reverse("auth-profile")


def payload(**overrides):
    data = {
        "full_name": "Aarav Sharma",
        "email": "aarav.sharma@bmsce.ac.in",
        "college": "BMS College of Engineering",
        "student_id": "1BM23CS001",
        "password": PASSWORD,
        "confirm_password": PASSWORD,
    }
    data.update(overrides)
    return data


class RegistrationTests(APITestBase):
    def test_register_creates_student_and_returns_tokens(self):
        res = self.client.post(REGISTER, payload())
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["role"], "student")
        user = User.objects.get(email="aarav.sharma@bmsce.ac.in")
        self.assertNotEqual(user.password, PASSWORD)  # hashed, never plain text
        self.assertTrue(user.check_password(PASSWORD))
        self.assertTrue(user.username)

    def test_email_is_case_insensitive_and_unique(self):
        self.client.post(REGISTER, payload())
        res = self.client.post(REGISTER, payload(email="AARAV.SHARMA@BMSCE.AC.IN", student_id="1BM23CS002"))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", res.data["errors"])

    def test_non_college_email_rejected_by_default(self):
        res = self.client.post(REGISTER, payload(email="someone@gmail.com"))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("college email", res.data["detail"])

    @override_settings(REQUIRE_COLLEGE_EMAIL=False)
    def test_college_email_check_can_be_disabled(self):
        res = self.client.post(REGISTER, payload(email="someone@gmail.com"))
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    @override_settings(ALLOWED_EMAIL_DOMAINS=["bmsce.ac.in"])
    def test_explicit_domain_allow_list(self):
        self.assertEqual(self.client.post(REGISTER, payload(email="x@rvce.edu.in")).status_code, 400)
        self.assertEqual(self.client.post(REGISTER, payload()).status_code, 201)

    def test_password_mismatch_and_weak_password(self):
        res = self.client.post(REGISTER, payload(confirm_password="Different-123"))
        self.assertEqual(res.status_code, 400)
        self.assertIn("confirm_password", res.data["errors"])
        res = self.client.post(REGISTER, payload(password="12345678", confirm_password="12345678"))
        self.assertEqual(res.status_code, 400)
        self.assertIn("password", res.data["errors"])

    def test_missing_fields_give_field_errors(self):
        res = self.client.post(REGISTER, {})
        self.assertEqual(res.status_code, 400)
        for field in ("full_name", "email", "college", "password"):
            self.assertIn(field, res.data["errors"])
        self.assertTrue(res.data["detail"])


class LoginLogoutTests(APITestBase):
    def setUp(self):
        super().setUp()
        self.user = make_user()

    def test_login_with_email(self):
        res = self.client.post(LOGIN, {"email": "Student@BMSCE.ac.in", "password": PASSWORD})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["user"]["email"], self.user.email)
        # The access token works for protected endpoints.
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        self.assertEqual(self.client.get(PROFILE).status_code, 200)

    def test_wrong_password_and_unknown_email_get_same_error(self):
        wrong = self.client.post(LOGIN, {"email": self.user.email, "password": "nope-nope-1"})
        unknown = self.client.post(LOGIN, {"email": "ghost@bmsce.ac.in", "password": PASSWORD})
        self.assertEqual(wrong.status_code, 400)
        self.assertEqual(wrong.data["detail"], unknown.data["detail"])

    def test_inactive_user_cannot_log_in(self):
        self.user.is_active = False
        self.user.save()
        self.assertEqual(self.client.post(LOGIN, {"email": self.user.email, "password": PASSWORD}).status_code, 400)

    def test_refresh_and_logout_blacklists_token(self):
        tokens = self.client.post(LOGIN, {"email": self.user.email, "password": PASSWORD}).data
        refreshed = self.client.post(reverse("auth-token-refresh"), {"refresh": tokens["refresh"]})
        self.assertEqual(refreshed.status_code, 200)
        new_refresh = refreshed.data["refresh"]  # rotation is enabled

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refreshed.data['access']}")
        self.assertEqual(self.client.post(reverse("auth-logout"), {"refresh": new_refresh}).status_code, 200)
        self.client.credentials()
        self.assertEqual(self.client.post(reverse("auth-token-refresh"), {"refresh": new_refresh}).status_code, 401)

    def test_logout_requires_authentication(self):
        self.assertEqual(self.client.post(reverse("auth-logout"), {"refresh": "x"}).status_code, 401)

    def test_login_is_rate_limited(self):
        with mock.patch.dict(SimpleRateThrottle.THROTTLE_RATES, {"auth": "3/min"}):
            codes = [self.client.post(LOGIN, {"email": self.user.email, "password": "bad-pass-1"}).status_code for _ in range(4)]
        self.assertEqual(codes[-1], 429)


class ProfileTests(APITestBase):
    def setUp(self):
        super().setUp()
        self.user = self.login(make_user())

    def test_profile_requires_auth(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(PROFILE).status_code, 401)

    def test_get_and_update_profile(self):
        res = self.client.patch(PROFILE, {"full_name": "New Name", "phone": "9876543210", "bio": "2nd year CSE"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["full_name"], "New Name")
        self.assertEqual(res.data["phone"], "9876543210")

    def test_cannot_change_email_or_role_via_profile(self):
        self.client.patch(PROFILE, {"email": "hacker@bmsce.ac.in", "role": "admin"})
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "student@bmsce.ac.in")
        self.assertEqual(self.user.role, "student")

    def test_invalid_phone(self):
        res = self.client.patch(PROFILE, {"phone": "12345"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("phone", res.data["errors"])

    def test_change_password(self):
        url = reverse("auth-change-password")
        bad = self.client.post(url, {"current_password": "wrong", "new_password": "An0ther-Pass!9"})
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post(url, {"current_password": PASSWORD, "new_password": "An0ther-Pass!9"})
        self.assertEqual(ok.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("An0ther-Pass!9"))


class PasswordResetTests(APITestBase):
    def test_reset_flow(self):
        user = make_user()
        res = self.client.post(reverse("auth-password-reset"), {"email": user.email})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        uid, token = re.search(r"uid=([^&]+)&token=(\S+)", mail.outbox[0].body).groups()
        res = self.client.post(reverse("auth-password-reset-confirm"), {"uid": uid, "token": token, "new_password": "Brand-New-Pass7"})
        self.assertEqual(res.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password("Brand-New-Pass7"))
        # The link cannot be reused.
        res = self.client.post(reverse("auth-password-reset-confirm"), {"uid": uid, "token": token, "new_password": "Other-Pass-88"})
        self.assertEqual(res.status_code, 400)

    def test_unknown_email_gives_same_answer(self):
        res = self.client.post(reverse("auth-password-reset"), {"email": "ghost@bmsce.ac.in"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)


class AdminUserManagementTests(APITestBase):
    def test_only_admins_can_list_and_suspend_users(self):
        student = make_user()
        self.login(student)
        self.assertEqual(self.client.get(reverse("admin-user-list")).status_code, 403)

        self.login(make_admin())
        res = self.client.get(reverse("admin-user-list"))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 2)
        res = self.client.patch(reverse("admin-user-detail", args=[student.pk]), {"is_active": False})
        self.assertEqual(res.status_code, 200)
        student.refresh_from_db()
        self.assertFalse(student.is_active)

    def test_admin_role_grants_staff_access(self):
        self.assertTrue(make_admin().is_staff)
        self.assertFalse(make_user("x@bmsce.ac.in").is_staff)
