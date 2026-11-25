# Campus Connect – Marketplace for Students

A campus-only marketplace where students buy, sell and exchange books, electronics, stationery, clothing, college accessories, sports equipment and hostel essentials.

This repository currently contains the **frontend prototype** (`frontend/`): React 18 + Vite, Bootstrap 5, custom CSS, React Router and Axios. It runs entirely on sample data and is wired so it can switch to the Django REST Framework backend later by changing one environment variable.

## Quick start

```bash
cd frontend
npm install
cp .env.example .env     # optional
npm run dev              # http://localhost:5173
```

`npm run build` writes a production build to `frontend/dist/`.

> **Demo login:** with sample data, any email and a password of 6 or more characters will log you in. Registration needs an academic email (`.ac.in`, `.edu`, …).

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
frontend/src
├── api/axios.js          # Axios instance: base URL, JWT header, auto token refresh, DRF error parsing
├── services/             # productService, authService, chatService, aiService (API ↔ sample-data switch)
├── context/              # AuthContext, WishlistContext, ToastContext
├── components/           # Navbar, Footer, HeroSection, CategoryCard, ProductCard, SearchBar, FilterSidebar,
│                         # ProductGrid, WishlistButton, LoginForm, RegisterForm, ProductForm, ChatWindow,
│                         # AIAssistant, EmptyState, Loader, ErrorState, PageHeader, ProtectedRoute … (+ .css each)
├── pages/                # One file (+ .css) per route
├── data/                 # Sample products, categories, conversations, admin stats
├── utils/                # Formatting (INR, dates), validation, image fallback, browsing interests
└── styles/global.css     # Design tokens (colours, radii, shadows) and Bootstrap overrides
```

## Connecting the Django backend

1. Set `VITE_USE_API=true` and `VITE_API_BASE_URL=https://<your-render-app>.onrender.com/api` in `frontend/.env`.
2. Implement these endpoints (the services already call them):

| Method & path | Used by |
|---|---|
| `POST /auth/register/`, `POST /auth/login/` → `{access, refresh, user}` | authService |
| `POST /auth/token/refresh/` (simplejwt) | axios interceptor |
| `POST /auth/password-reset/` | Forgot password |
| `GET /products/?search=&category=&condition=&min_price=&max_price=&available=&ordering=&page=` | Marketplace |
| `GET /products/featured/`, `GET /products/:id/`, `GET /products/:id/related/`, `GET /products/mine/` | Home, details, dashboard |
| `POST /products/` (multipart, `images[]`) | Sell page |
| `GET /recommendations/` | Recommended for You |
| `GET /conversations/`, `POST /conversations/`, `POST /conversations/:id/messages/` | Messaging |
| `POST /ai/assistant/` `{message, history}` → `{reply, products?}` | AI Assistant |

**Gemini API key:** the key lives only in the Django environment (`GEMINI_API_KEY`). The browser talks to `/api/ai/assistant/`, and Django calls Gemini. Never put the key in any `VITE_*` variable, because those are bundled into public JavaScript.

## Deployment

- **Frontend → Vercel:** set the root directory to `frontend`, framework to Vite, and add the `VITE_*` env vars. `vercel.json` adds the SPA rewrite so deep links work.
- **Backend → Render:** Django + DRF + PostgreSQL. Add the Vercel domain to `CORS_ALLOWED_ORIGINS`.
