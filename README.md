# Rongkushol storefront

A responsive Next.js and React storefront backed by a Flask REST API and Supabase Postgres/Auth. The original dark shoe-color hero and its blue, green, and neon animations are retained. The app includes a searchable/filterable catalog, rotating featured products and offers, product details, a persistent local shopping bag, Supabase email sign-in, editable profiles, and authenticated product reviews.

The bag is a local preview only. Checkout, order placement, and payment processing are intentionally disabled; no payment details are collected.

## Requirements

- Node.js 20.9 or later
- Python 3.10 or later
- A Supabase project

## Set up Supabase

1. In the Supabase SQL Editor, run `backend/schema.sql`. It creates the products, offers, profiles, and reviews tables, RLS policies, a new-user profile trigger, and sample catalog/offers that use the images in `public/img`.
2. In Supabase Auth settings, choose your email-confirmation behavior and add the local app URL (`http://localhost:3000`) to the allowed redirect URLs.
3. Copy `.env.example` to `.env.local` and fill in the project's URL and publishable/anon key. Never put a Supabase `service_role` key in a `NEXT_PUBLIC_*` variable or commit credentials.
4. Copy `backend/.env.example` to `backend/.env` and use the same project URL and publishable/anon key. Set `FRONTEND_ORIGINS` to the comma-separated allowed frontend origins when deploying.

If Supabase is not configured, API-backed pages show an explicit connection error rather than pretending the catalog or account actions succeeded.

## Run locally

In the repository root:

```powershell
npm install
npm run dev
```

In another terminal:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
python backend\app.py
```

Open `http://localhost:3000`. The Flask API listens on `http://127.0.0.1:5000`; its health endpoint is `/api/health`.

## Main API routes

- `GET /api/products?category=shoes&q=runner`
- `GET /api/products/{id}`
- `GET /api/offers`
- `GET /api/products/{id}/reviews`
- `POST /api/products/{id}/reviews` (requires a Supabase access token)

## Checks

```powershell
npm run build
python -m unittest discover -s backend -p "test_*.py"
```

The old Firebase project is not connected to the new app. Export and review any data you own before importing it into Supabase; the included SQL seeds a small sample catalog and does not migrate Firebase users, comments, or product data.
