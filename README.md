# gql.book-store.com.pl

Sklep internetowy z książkami: katalog, koszyk, checkout, płatności, panel admina oraz chat przy zamówieniu. Monorepo z API GraphQL i SPA React.

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
| **Produkcja** | EC2, Caddy (HTTPS), GitHub Actions — szczegóły w [DEPLOY.md](DEPLOY.md) |
| **Opcjonalnie** | AWS Lambda + SQS (mail potwierdzenia zamówienia) |

## Struktura repo

```
backend/          # Express + GraphQL + SQLite + Socket.IO
frontend/         # React SPA (Vite)
data/             # baza SQLite
uploads/          # obrazy produktów
lambda/           # funkcja AWS (maile potwierdzenia)
deploy/           # deploy v1
deploy-ver.2/     # deploy v2
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

Skonfiguruj zmienne w `.env` w katalogu głównym (m.in. `PORT`, `ADMIN_PASSWORD`, klucze Stripe/PayPal, SMTP jeśli potrzebne). Frontend w dev zwykle łączy się z GraphQL przez `VITE_GRAPHQL_URL` (np. w `frontend/.env.local`).

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

Zobacz [DEPLOY.md](DEPLOY.md) — dwie ścieżki (v1 ze skryptami / v2 ręcznie w AWS Console).
