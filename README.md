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
| `npm run lambda:package:order-email` | paczka ZIP do wgrania w AWS Lambda |

## Deploy

Zobacz [DEPLOY.md](DEPLOY.md) — EC2 v1 / EC2 v2 / OVH (wspólny layout `/var/www/gql-book-store`).

## Klucze AWS dla OVH (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`)

Na **OVH** (i lokalnie, jeśli testujesz kolejkę SQS) backend wysyła maile potwierdzenia zamówienia przez **SQS** — nie ma tam roli IAM jak na EC2, więc potrzebujesz **użytkownika IAM** z kluczem dostępu (tylko `sqs:SendMessage`).

Pełna konfiguracja SQS + Lambda: [deploy-ver.2/order-confirmation-lambda.md](deploy-ver.2/order-confirmation-lambda.md). Poniżej samo utworzenie kluczy.

### Wymagania w `.env`

```env
ORDER_CONFIRMATION_QUEUE_URL=https://sqs.eu-central-1.amazonaws.com/TWOJE_KONTO/NAZWA_KOLEJKI
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

Na **EC2** zostaw klucze puste — używana jest rola instancji.

### Kroki w AWS Console

1. **SQS** — utwórz kolejkę (jeśli jeszcze nie ma) i skopiuj **Queue URL** (patrz [order-confirmation-lambda.md](deploy-ver.2/order-confirmation-lambda.md#step-1-sqs-queue)).
2. **IAM** → **Policies** → **Create policy** → JSON (podmień `YOUR_ACCOUNT_ID` i nazwę kolejki):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sqs:SendMessage",
      "Resource": "arn:aws:sqs:eu-central-1:YOUR_ACCOUNT_ID:gql-book-store-order-confirmation"
    }
  ]
}
```

3. Nazwa polityki np. `gql-book-store-sqs-send-order-confirmation` → **Create policy**.
4. **IAM** → **Users** → **Create user** (np. `gql-book-store-ovh-sqs`).
5. **Attach policies directly** → wybierz utworzoną politykę (bez uprawnień konsoli / AdministratorAccess).
6. Po utworzeniu użytkownika: **Security credentials** → **Create access key**.
7. Typ: **Application running outside AWS** (VPS OVH / lokalny dev).
8. Skopiuj **Access key ID** (`AKIA...`) i **Secret access key** — secret widać **tylko raz**.
9. Wklej do `.env` (lokalnie) lub `/var/www/gql-book-store/shared/.env.production` (OVH). **Nie commituj** kluczy do repo.
10. Restart: `sudo systemctl restart gql-book-store` (OVH) lub restart `npm run dev` (lokalnie).

### Weryfikacja

Po opłaceniu zamówienia w logach backendu powinno być: `order confirmation email enqueued`. W CloudWatch (Lambda) — udane wywołanie po konsumpcji wiadomości z SQS.

Szczegóły deploy OVH: [deploy-ovh/README.md](deploy-ovh/README.md).

## Wgranie funkcji Lambda w AWS Console

Mail potwierdzenia zamówienia to funkcja `gql-book-store-order-confirmation-email` (kod w `lambda/order-confirmation-email/`). Pełna konfiguracja SQS + IAM: [order-confirmation-lambda.md](deploy-ver.2/order-confirmation-lambda.md). Poniżej: **spakowanie ZIP-a i wstawienie kodu w konsoli**.

### 1. Paczka ZIP (lokalnie)

Z katalogu głównego repo (`gql.book-store.com.pl/`):

```bash
npm run lambda:package:order-email
```

Powstanie plik `lambda/order-confirmation-email/function.zip` (handler: `index.handler`). Na Windowsie skrypt używa PowerShell `Compress-Archive` — osobny program `zip` nie jest potrzebny.

### 2. Nowa funkcja (jeśli jeszcze nie istnieje)

1. AWS Console → region **eu-central-1** → **Lambda** → **Create function**.
2. **Author from scratch**.
3. Function name: `gql-book-store-order-confirmation-email`.
4. Runtime: **Node.js 20.x**, Architecture: **x86_64**.
5. Execution role: istniejąca rola `gql-book-store-order-email-lambda-role` (z polityką `AWSLambdaSQSQueueExecutionRole`).
6. **Create function**.
7. **Configuration** → **General configuration** → **Edit**: timeout **30 s**, memory **256 MB**.
8. **Configuration** → **Environment variables** — te same wartości SMTP co na serwerze, m.in.: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `EMAIL_FROM`, opcjonalnie `CURRENCY`, `STORE_NAME`.
9. **Add trigger** → **SQS** → kolejka `gql-book-store-order-confirmation`, batch size **1**.

### 3. Wgranie (lub aktualizacja) kodu

1. Otwórz funkcję **gql-book-store-order-confirmation-email**.
2. Zakładka **Code**.
3. **Upload from** → **.zip file**.
4. Wybierz `lambda/order-confirmation-email/function.zip` → **Save**.
5. Sprawdź **Runtime settings** → **Handler**: `index.handler` (plik `index.mjs` w ZIP-ie).
6. **Deploy** (jeśli konsola o to poprosi po zapisie).

Limit rozmiaru ZIP-a w konsoli to **50 MB**. Ta funkcja (tylko `nodemailer`) mieści się bez S3.

### 4. Test w konsoli

**Test** → szablon zdarzenia SQS. Ciało wiadomości: `lambda/order-confirmation-email/test-event.json`. Po opłaceniu zamówienia w CloudWatch powinna pojawić się udana inwokacja.
