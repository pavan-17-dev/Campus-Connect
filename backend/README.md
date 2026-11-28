# Campus Connect – Backend (Django REST API)

REST API for **Campus Connect: Marketplace for Students**: a campus-only marketplace where college students buy, sell and exchange books, electronics, stationery, clothing, hostel essentials and more.

It powers the React frontend in [`../frontend`](../frontend).

---

## Features

| Area | What it does |
|---|---|
| **Accounts** | Custom `User` model (email login, student / administrator roles), registration with configurable college-email check, JWT login / logout (token blacklist) / refresh, profile view & update, change password, password reset by email |
| **Products** | Categories (managed in Django admin), listings with multiple images, conditions (New, Like New, Good, Used), statuses (Available, Reserved, Sold), search, filters, sorting, pagination, "my products", featured, related, per-seller and per-category lists, recommendations, report a listing |
| **Orders** | Request-to-buy flow for campus pickup (no payment gateway): pending → accepted → completed, or rejected / cancelled. Transactions + row locks prevent double-selling |
| **Messaging** | Private buyer–seller conversations (optionally about a product), unread counts, mark as read, polling with `?after=` (ready for WebSockets) |
| **AI (Google Gemini)** | Product description generator for the Sell form (the student reviews before publishing) and the floating AI shopping assistant. Key stays on the server, with timeouts, rate limits and friendly errors |
| **Admin** | Django admin for every model (search, filters, inline images/messages) plus admin-only API endpoints for the React admin dashboard |
| **Docs** | OpenAPI schema with Swagger UI at `/api/docs/` and ReDoc at `/api/redoc/` |

## Technology stack

| Component | Technology |
|---|---|
| Language | Python 3.12+ |
| Framework | Django 5.2 (LTS) |
| API | Django REST Framework 3.16 |
| Database | PostgreSQL (via `psycopg` 3) |
| Authentication | Django authentication + JWT (`djangorestframework-simplejwt`) |
| AI | Google Gemini API (`google-genai`, official SDK) |
| Images | Pillow + Django media files |
| API docs | drf-spectacular (Swagger / OpenAPI 3) |
| Deployment | Render (Gunicorn + WhiteNoise), frontend on Vercel |

## Folder structure

```
backend/
├── manage.py
├── requirements.txt
├── .env.example
├── build.sh                    # Render build script
├── config/                     # project settings & routing
│   ├── settings.py             # environment-based settings
│   ├── urls.py                 # /admin/ and /api/… routes, docs, media
│   ├── wsgi.py
│   └── asgi.py
├── core/                       # shared: pagination, error format, image validation,
│   ├── views.py                #   health check, admin stats
│   └── testing.py              # test helpers
├── accounts/                   # User model, auth & profile APIs, admin user management
├── products/                   # Category, Product, ProductImage, ProductReport
│   ├── filters.py              # ?category= ?min_price= ?condition= …
│   ├── permissions.py          # only the seller edits; seller or admin deletes
│   ├── migrations/0002_default_categories.py
│   └── management/commands/seed_demo_data.py
├── orders/                     # Order model + services.py (transactional state changes)
├── messaging/                  # Conversation, Message + services.py
└── ai_features/                # gemini.py (SDK wrapper), prompts, throttles, endpoints
```

Each app has its own `models.py`, `serializers.py`, `views.py`, `urls.py`, `admin.py` and `tests/`.

---

## Local setup

### 1. Prerequisites
- Python 3.12 or newer
- PostgreSQL 14 or newer

### 2. Create the database
```bash
psql -U postgres
```
```sql
CREATE USER campus WITH PASSWORD 'change-me' CREATEDB;
CREATE DATABASE campus_connect OWNER campus;
\q
```
`CREATEDB` lets the test runner create its temporary test database.

### 3. Virtual environment and dependencies
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Environment variables
```bash
cp .env.example .env
```
Edit `.env` and set at least:
```env
DEBUG=True
SECRET_KEY=any-long-random-string
DATABASE_URL=postgres://campus:change-me@localhost:5432/campus_connect
CORS_ALLOWED_ORIGINS=http://localhost:5173
GEMINI_API_KEY=your-key-from-https://aistudio.google.com/apikey   # optional
```
Generate a secret key with:
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 5. Migrate, seed and create an admin
```bash
python manage.py migrate                 # also creates the default categories
python manage.py seed_demo_data          # optional: demo students, 18 listings, an order, a chat
python manage.py createsuperuser         # your own admin account
```
The demo accounts all use the password `CampusDemo@2026` (change it with `--password`), e.g. `demo.student@bmsce.ac.in`. Add `--with-admin` to also create `admin@campusconnect.ac.in`.

### 6. Run
```bash
python manage.py runserver
```
- API: http://localhost:8000/api/
- Swagger docs: http://localhost:8000/api/docs/
- Django admin: http://localhost:8000/admin/

### 7. Connect the React frontend
In `frontend/.env.local`:
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_API=true
```
Then run `npm run dev` in `frontend/`.

---

## Configuration reference

| Variable | Default | Purpose |
|---|---|---|
| `SECRET_KEY` | – (required in production) | Django secret key |
| `DEBUG` | `False` | Never `True` in production |
| `DATABASE_URL` | – (required in production) | PostgreSQL connection URL |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Render adds its hostname automatically |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | React dev server + your Vercel URL |
| `CORS_ALLOWED_ORIGIN_REGEXES` | – | e.g. Vercel preview URLs |
| `GEMINI_API_KEY` | – | Without it AI endpoints answer `503` with a friendly message |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Any Gemini text model |
| `GEMINI_TIMEOUT_SECONDS` | `20` | Request timeout |
| `REQUIRE_COLLEGE_EMAIL` | `True` | Only academic emails can register |
| `COLLEGE_EMAIL_SUFFIXES` | `.ac.in,.edu,.edu.in` | Accepted email domain endings |
| `ALLOWED_EMAIL_DOMAINS` | – | Exact allow-list (e.g. `bmsce.ac.in`); overrides suffixes |
| `JWT_ACCESS_MINUTES` / `JWT_REFRESH_DAYS` | `30` / `7` | Token lifetimes |
| `THROTTLE_AUTH` / `THROTTLE_AI` / `THROTTLE_AI_DAILY` / `THROTTLE_MESSAGES` | `10/min` / `10/min` / `100/day` / `30/min` | Rate limits |
| `MEDIA_ROOT` | `backend/media` | Where uploaded images are stored |
| `SERVE_MEDIA` | same as `DEBUG` | Let Django serve uploaded images |
| `MAX_IMAGE_SIZE_MB` / `MAX_IMAGES_PER_PRODUCT` | `5` / `5` | Upload limits |
| `FRONTEND_URL` | `http://localhost:5173` | Used in password-reset emails |
| `EMAIL_*` | console backend | SMTP settings for real emails |

---

## API reference

Base URL: `/api`. JSON uses snake_case. Send the access token as `Authorization: Bearer <access>`.

**Auth needed:** 🔓 public · 🔐 logged in · 🛡️ administrator.

### Conventions
- **Errors** always look like `{"detail": "Readable message", "errors": {"field": ["…"]}}` (`errors` only for validation problems).
- **Status codes:** `200` OK, `201` created, `204` deleted, `400` validation error, `401` not logged in / bad token, `403` not allowed, `404` not found (also returned for private data you can't see), `409` state conflict (e.g. item no longer available), `429` rate limited, `503`/`504` AI service unavailable / timed out.
- **Lists** are paginated: `{"count", "next", "previous", "results"}`, with `?page=` and `?page_size=` (max 100).

### Authentication `/api/auth/`
| Method | Endpoint | | Description |
|---|---|---|---|
| POST | `/auth/register/` | 🔓 | `{full_name, email, college, student_id?, phone?, password, confirm_password?}` → `{user, access, refresh}` |
| POST | `/auth/login/` | 🔓 | `{email, password}` → `{user, access, refresh}` |
| POST | `/auth/logout/` | 🔐 | `{refresh}`: blacklists the refresh token |
| POST | `/auth/token/refresh/` | 🔓 | `{refresh}` → `{access, refresh}` (refresh tokens rotate) |
| GET / PATCH | `/auth/profile/` | 🔐 | Own profile. Editable: `full_name, username, phone, college, student_id, profile_picture, bio` |
| POST | `/auth/change-password/` | 🔐 | `{current_password, new_password}` |
| POST | `/auth/password-reset/` | 🔓 | `{email}`: emails a reset link (same answer whether or not the email exists) |
| POST | `/auth/password-reset/confirm/` | 🔓 | `{uid, token, new_password}` |
| GET | `/auth/users/` | 🛡️ | All users with listing counts (`?search=`) |
| PATCH | `/auth/users/<id>/` | 🛡️ | `{is_active}` or `{role}` (suspend / activate) |

### Categories & products
| Method | Endpoint | | Description |
|---|---|---|---|
| GET | `/categories/` | 🔓 | All categories with `product_count` |
| GET | `/categories/<slug>/` | 🔓 | One category |
| GET | `/categories/<slug>/products/` | 🔓 | Listings in a category (supports product filters) |
| GET | `/products/` | 🔓 | List listings (see filters below) |
| POST | `/products/` | 🔐 | Create a listing (JSON, or multipart with `uploaded_images` files) |
| GET | `/products/<id>/` | 🔓 | Details (seller info, images, `is_owner`) |
| PUT / PATCH | `/products/<id>/` | 🔐 seller | Update (can also append `uploaded_images`) |
| DELETE | `/products/<id>/` | 🔐 seller / 🛡️ | Delete (blocked while an order is pending/accepted) |
| GET | `/products/my-products/` | 🔐 | Current user's listings, all statuses |
| GET | `/products/featured/` | 🔓 | Featured listings (`?limit=`) |
| GET | `/products/<id>/related/` | 🔓 | Similar listings |
| POST | `/products/<id>/images/` | 🔐 seller | Upload images (multipart field `images`, repeatable) |
| DELETE | `/products/<id>/images/<image_id>/` | 🔐 seller | Remove an image |
| PATCH | `/products/<id>/status/` | 🔐 seller | `{status: available | reserved | sold}` |
| POST | `/products/<id>/report/` | 🔐 | `{reason: sold | misleading | price | prohibited | spam | other, details?}` |
| GET | `/sellers/<user_id>/products/` | 🔓 | A seller's listings |
| GET | `/recommendations/` | 🔓 | `?categories=books,electronics&limit=4` (+ the user's order/chat history when logged in) |
| GET / PATCH | `/admin/reports/`, `/admin/reports/<id>/` | 🛡️ | Review reports, `{is_resolved: true}` |
| GET | `/admin/stats/` | 🛡️ | Dashboard numbers, monthly listings, category breakdown, recent activity |

**Product filters:** `search` (title + description) · `category=books,electronics` · `condition=new,like_new` (codes or labels) · `min_price` · `max_price` · `available=true|false` · `status=available|reserved|sold` · `seller=<id>` · `campus=<text>` · `ordering=price|-price|created_at|-created_at`.

**Create a listing (multipart):**
```bash
curl -X POST http://localhost:8000/api/products/ \
  -H "Authorization: Bearer $ACCESS" \
  -F title="Casio fx-991ES Plus" -F description="Exam approved, used one semester, with cover." \
  -F price=750 -F category=electronics -F condition="Like New" -F location="CSE Block" \
  -F uploaded_images=@photo1.jpg -F uploaded_images=@photo2.jpg
```

**Product response (shortened):**
```json
{
  "id": 2, "title": "Casio fx-991ES Plus", "price": "750.00", "original_price": "1295.00",
  "category": "electronics", "category_detail": {"id": 2, "name": "Electronics", "slug": "electronics", "icon": "bi-laptop"},
  "condition": "like_new", "condition_display": "Like New", "status": "available", "is_available": true,
  "location": "CSE Block", "campus": "BMS College of Engineering",
  "seller": {"id": 2, "name": "Priya Nair", "avatar": "PN", "college": "BMS College of Engineering", "listings": 3},
  "images": [{"id": 3, "image": "http://localhost:8000/media/products/2/photo1.jpg"}],
  "is_owner": false, "created_at": "2026-11-27T10:30:00+05:30"
}
```

### Orders `/api/orders/`
| Method | Endpoint | | Description |
|---|---|---|---|
| POST | `/orders/` | 🔐 | `{product, note?, meeting_point?}` → pending order. `403` own product, `409` unavailable / duplicate |
| GET | `/orders/` | 🔐 | All my orders (`?role=buyer|seller`, `?status=`) |
| GET | `/orders/my-orders/` | 🔐 | Orders I placed |
| GET | `/orders/seller-orders/` | 🔐 | Orders for my listings |
| GET | `/orders/<id>/` | 🔐 buyer/seller | Details, including `can_accept`, `can_reject`, `can_cancel`, `can_complete` |
| POST | `/orders/<id>/accept/` | 🔐 seller | pending → accepted; item becomes **reserved**, other pending requests are rejected |
| POST | `/orders/<id>/reject/` | 🔐 seller | pending → rejected |
| POST | `/orders/<id>/cancel/` | 🔐 buyer | pending/accepted → cancelled; a reserved item becomes available again |
| POST | `/orders/<id>/complete/` | 🔐 seller | accepted → completed; item becomes **sold** |

Each listing is a single item, so `quantity` is always 1 and `total_price` equals the price. Payment happens in person at campus pickup.

### Messaging `/api/messages/`
| Method | Endpoint | | Description |
|---|---|---|---|
| POST | `/messages/` | 🔐 | `{receiver?, product?, content}`: send; creates the conversation if needed |
| GET | `/messages/conversations/` | 🔐 | My conversations: other participant, product, last message, `unread_count` |
| POST | `/messages/conversations/` | 🔐 | `{product}` and/or `{receiver}`: start or reopen a conversation |
| GET | `/messages/<conversation_id>/` | 🔐 participant | `{conversation, messages}` oldest → newest; `?after=<message id>` for new ones, `?limit=` |
| POST | `/messages/<conversation_id>/` | 🔐 participant | `{content}`: reply |
| POST | `/messages/<conversation_id>/read/` | 🔐 participant | Mark received messages as read |
| GET | `/messages/unread-count/` | 🔐 | `{unread}` |

The sender is always the logged-in user (never read from the request body). Non-participants get `404`.

### AI `/api/ai/`
| Method | Endpoint | | Description |
|---|---|---|---|
| POST | `/ai/generate-description/` | 🔐 | `{title, category, condition, details?}` → `{description, model, requires_review: true}`. Nothing is saved |
| POST | `/ai/assistant/` | 🔓 | `{message, history?: [{role: user|assistant, text}]}` → `{reply, products}` |

Inputs are validated before reaching Gemini (length limits, no links or prompt-injection phrases). The assistant only recommends real, available listings. Limits: 10 requests/minute and 100/day per user (or per IP).

### Utility
| Method | Endpoint | | Description |
|---|---|---|---|
| GET | `/health/` | 🔓 | `{"status": "ok", "database": "ok"}`: Render health check |
| GET | `/docs/`, `/redoc/`, `/schema/` | 🔓 | Interactive docs and OpenAPI schema |

---

## Security
- Passwords are hashed by Django (PBKDF2) and checked by Django's password validators.
- JWT access tokens (30 min) and rotating refresh tokens (7 days) with blacklisting on logout.
- Role-based (`IsAdminRole`) and object-level permissions (only the seller edits a listing; only the buyer/seller see an order; only participants see a conversation).
- Public seller data never includes email, phone or student ID.
- Image uploads are size-limited and verified with Pillow (only real JPEG/PNG/WEBP files).
- Rate limits on login/registration/password reset, messaging and AI endpoints.
- Secrets come only from environment variables. Production refuses to start without `SECRET_KEY` and `DATABASE_URL`.
- Production settings: HTTPS redirect, secure cookies, HSTS, `X-Frame-Options: DENY`, restricted CORS.
- Unexpected errors are logged and returned as a generic message (no stack traces).

## Tests
```bash
cd backend
source .venv/bin/activate
python manage.py test                     # all tests
python manage.py test orders              # one app
python manage.py test orders.tests.test_orders.ConcurrentOrderTests -v 2
```
The 87 tests cover registration, login/logout/refresh, profile and password changes, product create/list/update/delete permissions, image validation, search, filters and sorting, the full order lifecycle, concurrent orders (PostgreSQL row locking), messaging privacy, admin permissions, AI validation and error handling (Gemini is mocked, so no API key is needed), and the error format. They run against PostgreSQL using `DATABASE_URL` (the user needs `CREATEDB`).

---

## Deploying to Render

This repository includes a [`render.yaml`](../render.yaml) Blueprint that creates the PostgreSQL database and the web service.

1. Push the repository to GitHub.
2. In Render: **New → Blueprint**, then select the repository.
3. Enter the values Render asks for:
   - `GEMINI_API_KEY`: from Google AI Studio
   - `CORS_ALLOWED_ORIGINS`: your Vercel URL, e.g. `https://campus-connect.vercel.app`
   - `FRONTEND_URL`: the same Vercel URL
4. Deploy. On each deploy Render runs:
   - **Build:** `./build.sh` (installs requirements, `collectstatic`)
   - **Pre-deploy:** `python manage.py migrate --no-input`
   - **Start:** `gunicorn config.wsgi:application`
   - **Health check:** `/api/health/`
5. Create an admin from the service's **Shell** tab:
   ```bash
   python manage.py createsuperuser
   ```
   Optionally load demo data with `python manage.py seed_demo_data`.

**Uploaded images:** Render's normal filesystem is wiped on every deploy. The Blueprint attaches a 1 GB **persistent disk** at `/var/data` and sets `MEDIA_ROOT=/var/data/media`. Persistent disks need a paid instance type (the Blueprint uses `starter`). On the free instance type, remove the `disk` block; the app still works, but uploaded images disappear on each redeploy.

**Manual setup (without the Blueprint):** create a PostgreSQL database and a Python web service with root directory `backend`, then use the build, pre-deploy and start commands above. Set `DATABASE_URL` (the internal connection string), `SECRET_KEY`, `DEBUG=False`, `CORS_ALLOWED_ORIGINS`, `GEMINI_API_KEY`, `MEDIA_ROOT` and `SERVE_MEDIA=True`.

### Frontend on Vercel
Set the project root to `frontend`, then add these environment variables:
```env
VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api
VITE_USE_API=true
```
Redeploy. Make sure the Vercel URL is listed in the backend's `CORS_ALLOWED_ORIGINS`.

## Roadmap ideas
- Real-time chat with Django Channels (the messaging service layer is already separate from the views)
- Server-side wishlist (currently stored in the browser)
- Email verification links for new accounts (the `is_email_verified` flag is already on the user model)
