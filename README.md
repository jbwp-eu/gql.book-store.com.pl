# gql.book-store.com.pl

**Język:** Polski | [English](README.en.md)

Full-stackowy sklep z książkami (monorepo): **React 19** + **Vite** (**Material UI**, **Redux Toolkit**, **React Router v7**) oraz API **Express** **GraphQL** (**JWT**, **Socket.IO**, **better-sqlite3**, lokalne uploady). **Stripe** i **PayPal**; opcjonalny mail potwierdzenia zamówienia przez **AWS SQS** + **Lambda**. Testy: **Cypress**, **Vitest**, **Supertest**. CI/CD: **GitHub Actions**. Deploy na **AWS EC2**. Napisany z pomocą **Cursor**.

## Co robi aplikacja

- **Katalog** — lista produktów, wyszukiwanie, szczegóły, recenzje, featured
- **Konto** — rejestracja / logowanie (JWT), profil, moje zamówienia i recenzje
- **Zakup** — koszyk (lokalnie w przeglądarce) → wysyłka → płatność → złożenie zamówienia
- **Płatności** — Stripe i PayPal
- **Admin** — overview (sprzedaż), produkty, użytkownicy, zamówienia, recenzje
- **Chat** — wiadomości na żywo przy zamówieniu (Socket.IO)
- **i18n** — PL / EN, motyw jasny/ciemny, mapa lokalizacji sklepu
- **Kontakt** — formularz z wysyłką e-mail

## Stack

| Warstwa | Technologie |
|--------|-------------|
| **Backend** | Node.js, Express 5, GraphQL (`graphql-http`), TypeScript, better-sqlite3, JWT, Socket.IO, Stripe, PayPal, Multer, Nodemailer |
| **Frontend** | React 19, Vite, TypeScript, React Router, MUI, Redux Toolkit, i18next, React Hook Form + Zod, Stripe / PayPal JS, Socket.IO client |
| **Dane** | SQLite (`data/`), uploady obrazów (`uploads/`) |
| **Testy** | Vitest, Cypress (e2e) |
| **Produkcja** | EC2 / OVH, Caddy (HTTPS), GitHub Actions — szczegóły w [DEPLOY.md](DEPLOY.md) |
| **Opcjonalnie** | AWS Lambda + SQS (mail potwierdzenia zamówienia) |

## Struktura repo

```
backend/          # Express + GraphQL + SQLite + Socket.IO
frontend/         # React SPA (Vite)
data/             # baza SQLite
uploads/          # obrazy produktów
lambda/           # funkcja AWS (maile potwierdzenia)
deploy/           # deploy EC2 v1
deploy-ver.2/     # deploy EC2 v2
deploy-ovh/       # deploy OVH (ten sam layout co v2)
cypress/          # testy e2e
scripts/          # helpery (e2e, pakowanie lambdy)
```

**Backend** — źródło prawdy: API, baza, auth, płatności, webhook Stripe, upload, chat.  
**Frontend** — UI, routing, koszyk lokalny, wywołania GraphQL / Socket.IO.

## Uruchomienie lokalne

Wymagania: Node.js 22+.

```bash
npm install
npm install --prefix frontend
```

Skonfiguruj zmienne w **jednym** pliku `.env` w katalogu głównym (wzór: [`.env.example`](.env.example) — m.in. `PORT`, `ADMIN_PASSWORD`, `DEPLOY_TARGET`, Stripe `STRIPE_*_TEST_MODE_OVH` / `_AWS`, PayPal, SMTP). Frontend w dev: `frontend/.env.local` (`VITE_DEPLOY_TARGET`, `VITE_STRIPE_PUBLISHABLE_KEY_TEST_MODE_OVH` / `_AWS`, `VITE_GRAPHQL_URL`).

Na VPS: skopiuj `.env` → `/var/www/gql-book-store/shared/.env.production` i dostosuj wartości produkcyjne (wzór: [`.env.production.example`](.env.production.example)). Backend przy `NODE_ENV=production` ładuje `.env.production` jeśli istnieje, w przeciwnym razie `.env`.

```bash
npm run dev
```

- Frontend: Vite (domyślnie `http://localhost:5173`)
- Backend: GraphQL na `http://localhost:4000/graphql` (GraphiQL: `/graphiql`)

Inne skrypty:

| Komenda | Opis |
|---------|------|
| `npm run build` | build backend + frontend |
| `npm start` | produkcyjny start backendu (serwuje też `frontend/dist`) |
| `npm test` | Vitest |
| `npm run e2e:run` | Cypress headless |
| `npm run e2e:open` | Cypress UI |

## Deploy

Zobacz [DEPLOY.md](DEPLOY.md) — EC2 v1 / EC2 v2 / OVH (wspólny layout `/var/www/gql-book-store`).
