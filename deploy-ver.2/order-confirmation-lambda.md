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
3. Attach the policy to the **EC2 instance IAM role** (recommended for v2; no access keys on the server). Do **not** attach it to the Lambda role from Step 2. On EC2 leave `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` empty — the SDK uses the instance role.

   **A. Find or create the instance role**

   1. **EC2** → **Instances** → instance `gql-book-store` → **Security** tab.
   2. Check **IAM role**.
   3. If a role is **already set** — note its name and go to B.
   4. If there is **none** (common in v2; launch does not create a role):
      - **IAM** → **Roles** → **Create role**
      - Trusted entity: **AWS service** → **EC2** (not Lambda)
      - Permissions: skip for now — the SQS policy is attached in B
      - Name e.g. `gql-book-store-ec2-role` → **Create role**
      - **EC2** → instance → **Actions** → **Security** → **Modify IAM role**
      - Select `gql-book-store-ec2-role` → **Update IAM role**

   **B. Attach the SQS send policy to that role**

   1. **IAM** → **Roles** → open the role from A (`gql-book-store-ec2-role` or the existing one).
   2. **Permissions** → **Add permissions** → **Attach policies**.
   3. Search `gql-book-store-sqs-send-order-confirmation`.
   4. Select it → **Add permissions**.

   Do not attach `AWSLambdaSQSQueueExecutionRole` here.

### OVH VPS (access keys)

EC2 instance roles are not available on OVH. Create an **IAM user** with only the policy above, create an access key, then put in `shared/.env.production`:

```
ORDER_CONFIRMATION_QUEUE_URL=https://sqs.eu-central-1.amazonaws.com/YOUR_ACCOUNT_ID/gql-book-store-order-confirmation
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

Restart `gql-book-store` after editing. Do not commit these keys.

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

On **OVH** also set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (IAM user with `sqs:SendMessage`). On **EC2 v2** prefer the instance role and omit the keys.
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

Stripe webhook URL (AWS): `https://gql.book-store.pl/webhooks/stripe`
