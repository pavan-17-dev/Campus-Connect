# Campus Connect – Marketplace for Students

A campus-only marketplace where students buy, sell and exchange books, electronics, stationery, clothing, college accessories, sports equipment and hostel essentials.

| Part | Folder | Stack | Deploys to |
|---|---|---|---|
| Frontend | [`frontend/`](frontend) | React 18 + Vite, Bootstrap 5, CSS, React Router, Axios | Vercel |
| Backend | [`backend/`](backend) | Django 5.2, Django REST Framework, PostgreSQL, JWT, Google Gemini | Render |

Full backend documentation (setup, every API endpoint, tests, deployment) is in **[backend/README.md](backend/README.md)**.

## Quick start

**1. Backend** (needs Python 3.12+ and PostgreSQL; database setup is in the backend README):
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # set SECRET_KEY, DEBUG=True, DATABASE_URL, GEMINI_API_KEY
python manage.py migrate
python manage.py seed_demo_data # optional demo data
python manage.py runserver      # http://localhost:8000/api/docs/
```

**2. Frontend:**
```bash
cd frontend
npm install
cp .env.example .env.local      # VITE_USE_API=true, VITE_API_BASE_URL=http://localhost:8000/api
npm run dev                     # http://localhost:5173
```

> **Demo login:** after `seed_demo_data`, log in as `demo.student@bmsce.ac.in` with password `CampusDemo@2026`.
> To run the frontend without the backend, set `VITE_USE_API=false`; it then uses built-in sample data.

## Pages

| Route | Page |
|---|---|
| `/` | Home: hero and search, categories, featured products, how it works, AI "Recommended for You", CTA |
| `/marketplace` | Search, category, price, availability and condition filters, sorting, load-more (filters are kept in the URL) |
| `/categories` | All categories with item counts |
| `/product/:id` | Image gallery, details, seller info, wishlist, Contact Seller, related products |
| `/login`, `/register`, `/forgot-password` | Auth with validation, show/hide password, remember me, password strength |
| `/sell` 🔒 | Listing form with drag-and-drop image upload and preview, live listing preview |
| `/dashboard` 🔒 | Profile, My Listings, My Orders, Wishlist, Messages, Edit Profile, Logout |
| `/wishlist` | Saved products |
| `/messages` 🔒 | Conversation list and chat window (timestamps, quick replies) |
| `/admin` 🔒 | Stats, listings chart, category breakdown, activity feed, user/product/report management |
| `/about`, `/contact`, `/help`, `/privacy`, `/terms` | Info pages |

🔒 = redirects to login and returns afterwards.

A floating **Campus Connect AI Assistant** (bottom-right) helps students find products, browse categories and get answers to marketplace questions.

## Project structure

```
render.yaml               # Render Blueprint (database + API service)
backend/                  # Django project – see backend/README.md
├── config/               # settings, urls, wsgi/asgi
├── accounts/ products/ orders/ messaging/ ai_features/ core/
└── requirements.txt, .env.example, build.sh

frontend/src
├── api/                  # axios.js (JWT, token refresh, errors) · normalize.js (API → component shapes)
├── services/             # product, auth, order, chat, ai, admin services (API ↔ sample-data switch)
├── context/              # AuthContext, WishlistContext, ToastContext
├── components/           # Navbar, Footer, HeroSection, CategoryCard, ProductCard, SearchBar, FilterSidebar,
│                         # ProductGrid, WishlistButton, LoginForm, RegisterForm, ProductForm, ChatWindow,
│                         # AIAssistant, EmptyState, Loader, ErrorState, PageHeader, ProtectedRoute … (+ .css each)
├── pages/                # One file (+ .css) per route
├── data/                 # Sample products, categories, conversations, admin stats
├── utils/                # Formatting (INR, dates), validation, image fallback, browsing interests
└── styles/global.css     # Design tokens (colours, radii, shadows) and Bootstrap overrides
```

## How the frontend talks to the backend

- `frontend/src/api/axios.js`: Axios instance that adds the JWT, refreshes expired tokens and reads the backend's `{detail, errors}` error format.
- `frontend/src/api/normalize.js`: converts the API's snake_case JSON into the camelCase objects the components use.
- `frontend/src/services/*`: one service per feature (products, auth, orders, chat, AI, admin). Each switches between the API and sample data using `VITE_USE_API`.

The Gemini API key lives only in the backend (`GEMINI_API_KEY`). Never put it in a `VITE_*` variable, because those are bundled into public JavaScript.

## Deployment

- **Backend → Render:** use the included [`render.yaml`](render.yaml) Blueprint (PostgreSQL + web service + persistent disk for images). Step-by-step instructions are in [backend/README.md](backend/README.md#deploying-to-render).
- **Frontend → Vercel:** set the root directory to `frontend` and the framework to Vite. Add `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api` and `VITE_USE_API=true`. `vercel.json` adds the SPA rewrite so deep links work.
- Add the Vercel URL to the backend's `CORS_ALLOWED_ORIGINS`.
