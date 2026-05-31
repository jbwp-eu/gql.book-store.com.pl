# Order confirmation email (SQS + Lambda + SMTP)

EC2 enqueues a message when Stripe marks an order paid or when PayPal capture succeeds in `placeOrder`; Lambda sends the confirmation email via SMTP.

For deploy **v2** only ([README.md](README.md)). Uses the same paths as v2 (`/var/www/gql-book-store/shared/.env.production`, `ubuntu` user).

## Prerequisites

- AWS region: **eu-central-1** (same as EC2)
- SMTP variables already working on EC2 (`SMTP_*`, `EMAIL_FROM`)

## Step 1: SQS queue

1. AWS Console → **SQS** → **Create queue**
2. Type: **Standard**
3. Name: `gql-book-store-order-confirmation`
4. Visibility timeout: **60** seconds
5. Create queue; copy **Queue URL**

## Step 2: IAM role for Lambda

1. **IAM** → **Roles** → **Create role**
2. Trusted entity: **Lambda**
3. Attach: `AWSLambdaSQSQueueExecutionRole`
4. Name: `gql-book-store-order-email-lambda-role`

## Step 3: IAM policy for EC2 (SQS send)

1. **IAM** → **Policies** → **Create policy** → JSON:

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

2. Name: `gql-book-store-sqs-send-order-confirmation`
3. Attach to the **EC2 instance IAM role** (recommended for v2; no access keys on the server)

## Step 4: Lambda function

1. **Lambda** → **Create function** → Node.js **20.x**, x86_64
2. Name: `gql-book-store-order-confirmation-email`
3. Role: `gql-book-store-order-email-lambda-role`
4. Timeout **30 s**, memory **256 MB**
5. Environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `EMAIL_FROM`, `CURRENCY`, `STORE_NAME` (optional)
6. **Add trigger** → **SQS** → queue `gql-book-store-order-confirmation`, batch size **1**

## Step 5: Upload Lambda code

From **repo root** (`gql.book-store.com.pl/`, not `deploy-ver.2/`):

```bash
npm run lambda:package:order-email
```

This installs production deps in `lambda/order-confirmation-email/` and writes `lambda/order-confirmation-email/function.zip` (uses `zip` on Linux/macOS, PowerShell `Compress-Archive` on Windows — no separate `zip` install needed).

Lambda Console → **Upload from** → **.zip file** → select `lambda/order-confirmation-email/function.zip`.

Handler: `index.handler`

## Step 6: EC2 environment (v2)

Add to `/var/www/gql-book-store/shared/.env.production` (see [shared.env.production.example](shared.env.production.example)):

```
ORDER_CONFIRMATION_QUEUE_URL=https://sqs.eu-central-1.amazonaws.com/YOUR_ACCOUNT_ID/gql-book-store-order-confirmation
AWS_REGION=eu-central-1
```

Restart:

```bash
sudo systemctl restart gql-book-store
```

## Test Lambda (Console)

Use **Test** with SQS template and body from `lambda/order-confirmation-email/test-event.json`.

## Verify end-to-end

1. Place a Stripe **test** order and complete payment
2. Place a PayPal **sandbox** order and complete payment
3. CloudWatch → Lambda log group → successful invocation
4. EC2 logs: `order confirmation email enqueued`
5. Customer receives confirmation email

Stripe webhook URL (unchanged): `https://gql.book-store.com.pl/webhooks/stripe`
