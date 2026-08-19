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

Configure variables in a **single** root `.env` (template: [`.env.example`](.env.example) — e.g. `PORT`, `ADMIN_PASSWORD`, `DEPLOY_TARGET`, Stripe `STRIPE_*_TEST_MODE_OVH` / `_AWS`, PayPal, SMTP). Frontend in dev: `frontend/.env.local` (`VITE_DEPLOY_TARGET`, `VITE_STRIPE_PUBLISHABLE_KEY_TEST_MODE_OVH` / `_AWS`, `VITE_GRAPHQL_URL`).

On the VPS: copy `.env` → `/var/www/gql-book-store/shared/.env.production` and adjust production values (template: [`.env.production.example`](.env.production.example)). With `NODE_ENV=production` the backend loads `.env.production` if present, otherwise `.env`.

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
| `npm run lambda:package:order-email` | ZIP package to upload in AWS Lambda |

## Deploy

See [DEPLOY.md](DEPLOY.md) — EC2 v1 / EC2 v2 / OVH (shared layout `/var/www/gql-book-store`).

## AWS keys for OVH (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`)

On **OVH** (and locally when testing the SQS queue) the backend sends order confirmation messages via **SQS**. There is no EC2 instance role on OVH, so you need an **IAM user** with an access key limited to `sqs:SendMessage`.

Full SQS + Lambda setup: [deploy-ver.2/order-confirmation-lambda.md](deploy-ver.2/order-confirmation-lambda.md). Below: creating the access keys only.

### Required `.env` variables

```env
ORDER_CONFIRMATION_QUEUE_URL=https://sqs.eu-central-1.amazonaws.com/YOUR_ACCOUNT_ID/QUEUE_NAME
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

On **EC2**, leave the keys empty — use the instance IAM role instead.

### Steps in AWS Console

1. **SQS** — create the queue (if missing) and copy the **Queue URL** (see [order-confirmation-lambda.md](deploy-ver.2/order-confirmation-lambda.md#step-1-sqs-queue)).
2. **IAM** → **Policies** → **Create policy** → JSON (replace `YOUR_ACCOUNT_ID` and queue name):

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

3. Policy name e.g. `gql-book-store-sqs-send-order-confirmation` → **Create policy**.
4. **IAM** → **Users** → **Create user** (e.g. `gql-book-store-ovh-sqs`).
5. **Attach policies directly** → select the policy above (no console login / no AdministratorAccess).
6. Open the user → **Security credentials** → **Create access key**.
7. Use case: **Application running outside AWS** (OVH VPS / local dev).
8. Copy **Access key ID** (`AKIA...`) and **Secret access key** — the secret is shown **only once**.
9. Add to `.env` (local) or `/var/www/gql-book-store/shared/.env.production` (OVH). **Do not commit** keys to the repo.
10. Restart: `sudo systemctl restart gql-book-store` (OVH) or restart `npm run dev` (local).

### Verify

After a paid order, backend logs should show: `order confirmation email enqueued`. In CloudWatch (Lambda), a successful invocation after the SQS message is consumed.

OVH deploy details: [deploy-ovh/README.md](deploy-ovh/README.md).

## Upload the Lambda function in AWS Console

Order-confirmation email is the function `gql-book-store-order-confirmation-email` (code in `lambda/order-confirmation-email/`). Full SQS + IAM setup: [order-confirmation-lambda.md](deploy-ver.2/order-confirmation-lambda.md). Below: **pack the ZIP and upload the code in the console**.

### 1. ZIP package (local)

From the repo root (`gql.book-store.com.pl/`):

```bash
npm run lambda:package:order-email
```

This creates `lambda/order-confirmation-email/function.zip` (handler: `index.handler`). On Windows the script uses PowerShell `Compress-Archive` — a separate `zip` install is not required.

### 2. Create the function (if it does not exist yet)

1. AWS Console → region **eu-central-1** → **Lambda** → **Create function**.
2. **Author from scratch**.
3. Function name: `gql-book-store-order-confirmation-email`.
4. Runtime: **Node.js 20.x**, Architecture: **x86_64**.
5. Execution role: existing role `gql-book-store-order-email-lambda-role` (with `AWSLambdaSQSQueueExecutionRole`).
6. **Create function**.
7. **Configuration** → **General configuration** → **Edit**: timeout **30 s**, memory **256 MB**.
8. **Configuration** → **Environment variables** — same SMTP values as on the server, e.g. `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `EMAIL_FROM`, optional `CURRENCY`, `STORE_NAME`.
9. **Add trigger** → **SQS** → queue `gql-book-store-order-confirmation`, batch size **1**.

### 3. Upload (or update) the code

1. Open the function **gql-book-store-order-confirmation-email**.
2. **Code** tab.
3. **Upload from** → **.zip file**.
4. Select `lambda/order-confirmation-email/function.zip` → **Save**.
5. Check **Runtime settings** → **Handler**: `index.handler` (`index.mjs` inside the ZIP).
6. **Deploy** if the console asks after saving.

Console ZIP upload limit is **50 MB**. This function (nodemailer only) fits without S3.

### 4. Test in the console

**Test** → SQS event template. Message body: `lambda/order-confirmation-email/test-event.json`. After a paid order, CloudWatch should show a successful invocation.
