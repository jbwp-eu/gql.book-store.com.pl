# gql.book-store.com.pl

**Language:** [Polski](README.md) | English

A full-stack bookstore monorepo: **React 19** + **Vite** (**Material UI**, **Redux Toolkit**, **React Router v7**) and an **Express** **GraphQL** API (**JWT**, **Socket.IO**, **better-sqlite3**, local uploads). **Stripe** and **PayPal**; optional order-confirmation email via **AWS SQS** + **Lambda**. Tests: **Cypress**, **Vitest**, **Supertest**. CI/CD via **GitHub Actions**. Deployed on **AWS EC2**. Built with **Cursor**.

## What the app does

- **Catalog** — product list, search, details, reviews, featured
- **Account** — register / login (JWT), profile, my orders and reviews
- **Purchase** — cart (local in the browser) → shipping → payment → place order
- **Payments** — Stripe and PayPal
- **Admin** — overview (sales), products, users, orders, reviews
- **Chat** — live messages on an order (Socket.IO)
- **i18n** — PL / EN, light/dark theme, store locator map
- **Contact** — form with email delivery

## Stack

| Layer | Technologies |
|--------|-------------|
| **Backend** | Node.js, Express 5, GraphQL (`graphql-http`), TypeScript, better-sqlite3, JWT, Socket.IO, Stripe, PayPal, Multer, Nodemailer |
| **Frontend** | React 19, Vite, TypeScript, React Router, MUI, Redux Toolkit, i18next, React Hook Form + Zod, Stripe / PayPal JS, Socket.IO client |
| **Data** | SQLite (`data/`), product image uploads (`uploads/`) |
| **Tests** | Vitest, Cypress (e2e) |
| **Production** | EC2 / OVH, Caddy (HTTPS), GitHub Actions — see [DEPLOY.md](DEPLOY.md) |
| **Optional** | AWS Lambda + SQS (order confirmation email) |

## Repo structure

```
backend/          # Express + GraphQL + SQLite + Socket.IO
frontend/         # React SPA (Vite)
data/             # SQLite database
uploads/          # product images
lambda/           # AWS function (confirmation emails)
deploy/           # EC2 deploy v1
deploy-ver.2/     # EC2 deploy v2
deploy-ovh/       # OVH deploy (same layout as v2)
cypress/          # e2e tests
scripts/          # helpers (e2e, lambda packaging)
```

**Backend** — source of truth: API, database, auth, payments, Stripe webhook, uploads, chat.  
**Frontend** — UI, routing, local cart, GraphQL / Socket.IO calls.

## Local setup

Requirements: Node.js 22+.

```bash
npm install
npm install --prefix frontend
```

Configure variables in the root `.env` (e.g. `PORT`, `ADMIN_PASSWORD`, `DEPLOY_TARGET`, Stripe keys `STRIPE_*_TEST_MODE_OVH` / `_AWS`, PayPal, SMTP if needed). Frontend in dev: `VITE_DEPLOY_TARGET` and `VITE_STRIPE_PUBLISHABLE_KEY_TEST_MODE_OVH` / `_AWS` (e.g. in `frontend/.env.local`), plus usually `VITE_GRAPHQL_URL`.

```bash
npm run dev
```

- Frontend: Vite (default `http://localhost:5173`)
- Backend: GraphQL at `http://localhost:4000/graphql` (GraphiQL: `/graphiql`)

Other scripts:

| Command | Description |
|---------|-------------|
| `npm run build` | build backend + frontend |
| `npm start` | production backend start (also serves `frontend/dist`) |
| `npm test` | Vitest |
| `npm run e2e:run` | Cypress headless |
| `npm run e2e:open` | Cypress UI |

## Deploy

See [DEPLOY.md](DEPLOY.md) — EC2 v1 / EC2 v2 / OVH (shared layout `/var/www/gql-book-store`).
