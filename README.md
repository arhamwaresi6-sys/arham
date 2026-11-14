# Rongkushol storefront

A responsive Next.js and React storefront backed by a Flask REST API and Supabase Postgres/Auth. The original dark shoe-color hero and its blue, green, and neon animations are retained and refined with subtle entrance/hover motion. The app includes a searchable/filterable catalog, rotating featured products and offers, product details, a persistent local shopping bag, Supabase email/password and Google sign-in, editable profiles, authenticated product reviews, and a role-protected admin panel for products and offers.

The bag is a local preview only. Checkout, order placement, and payment processing are intentionally disabled; no payment details are collected.

The Next.js frontend and Flask API are configured as Vercel Services in one deployment, sharing the `/api` route on the same origin. Vercel Services are currently in beta and must be available to your Vercel project.

## Requirements

- Node.js 20.9 or later
- Python 3.10 or later
- A Supabase project

## Set up Supabase

1. Create a public Supabase Storage bucket named `product-images` and upload the product and offer image files. In the Supabase SQL Editor, run `backend/schema.sql`. It creates or updates the products, offers, profiles, reviews, and private user-directory tables; adds database-enforced admin policies; and seeds sample products/offers with public URLs from that bucket. If you already set up the store, rerun the full script to add the admin role support and additional demo rows.
2. In Supabase Auth settings, choose your email-confirmation behavior and allow `http://localhost:3000/auth/callback` plus your production app's `/auth/callback` URL in the redirect URL list.
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Restart Next.js after changing these values. Never put a Supabase `service_role` key in a `NEXT_PUBLIC_*` variable or commit credentials.
4. Copy `backend/.env.example` to `backend/.env` and use the same project URL and publishable/anon key. Set `FRONTEND_ORIGINS` to the comma-separated allowed frontend origins when deploying.
5. To deploy on Vercel, import this GitHub repository as a new project with the repository root as the project root. Vercel reads `vercel.json` to deploy the frontend and Flask API as separate services on the same domain. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project for both Preview and Production, then redeploy. Keep the Supabase keys as environment variables; never commit them.

## Configure Google sign-in

1. In Google Cloud Console, create an OAuth client ID for a **Web application**. Add your app origins (for local development, `http://localhost:3000`) as authorized JavaScript origins. Add the Supabase project's OAuth callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI.
2. In Supabase Dashboard, open **Authentication → Providers → Google**, enable Google, and enter the Google client ID and client secret.
3. In Supabase **Authentication → URL Configuration**, allow `http://localhost:3000/auth/callback` and the matching callback URL for each deployed app origin. Add deployed origins to Google's authorized JavaScript origins too.

The Supabase account `arhamwaresi6@gmail.com` is the store root. Sign in with that email to open `/admin`, view the user directory, and grant or revoke administrator access. Admins can add, edit, feature, archive, and restore products and offers. The admin API verifies Supabase sessions, while database row-level security and role-protection triggers enforce permissions independently of the UI; no service-role key is needed.

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

Open `http://localhost:3000`. Start Flask on `http://127.0.0.1:5000`; Next.js proxies local `/api/*` requests to it. Its health endpoint is `/api/health`.

## Main API routes

- `GET /api/products?category=shoes&q=runner`
- `GET /api/products/{id}`
- `GET /api/offers`
- `GET /api/products/{id}/reviews`
- `POST /api/products/{id}/reviews` (requires a Supabase access token)
- `/api/admin/products` and `/api/admin/offers` (admin-only list/create/update/archive)
- `/api/admin/users` and `/api/admin/users/{id}/role` (root-only user and role management)

## Checks

```powershell
npm run build
python -m unittest discover -s backend -p "test_*.py"
```

The old Firebase project is not connected to the new app. Export and review any data you own before importing it into Supabase; the included SQL seeds a small sample catalog and does not migrate Firebase users, comments, or product data.
