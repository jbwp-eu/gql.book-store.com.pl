# gql.book-store.com.pl

**Language:** [Polski](README.md) | English

A full-stack online bookstore monorepo: **React 19** + **Vite** SPA with **Material UI**, **Redux Toolkit**, and **React Router v7** (data mode); backend on **Express** with **GraphQL**, **JWT**, **Socket.IO** (order chat), **better-sqlite3**, and local file uploads. Payments via **Stripe** and **PayPal**. Deployed to **AWS EC2** with **GitHub Actions** (live at `gql.book-store.com.pl`). Tested with **Cypress**, **Vitest**, and **Supertest**. Built with the assistance of **Cursor**.

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
| **Production** | EC2, Caddy (HTTPS), GitHub Actions — see [DEPLOY.md](DEPLOY.md) |
| **Optional** | AWS Lambda + SQS (order confirmation email) |

## Repo structure

```
backend/          # Express + GraphQL + SQLite + Socket.IO
frontend/         # React SPA (Vite)
data/             # SQLite database
uploads/          # product images
lambda/           # AWS function (confirmation emails)
deploy/           # deploy v1
deploy-ver.2/     # deploy v2
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

Configure variables in the root `.env` (e.g. `PORT`, `ADMIN_PASSWORD`, Stripe/PayPal keys, SMTP if needed). In development the frontend usually talks to GraphQL via `VITE_GRAPHQL_URL` (e.g. in `frontend/.env.local`).

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

See [DEPLOY.md](DEPLOY.md) — two paths (v1 with scripts / v2 manual AWS Console setup).
