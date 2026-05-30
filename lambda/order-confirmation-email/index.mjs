import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_SECURE,
  EMAIL_FROM,
  CURRENCY = "PLN",
  STORE_NAME = "Book Store",
} = process.env;

function requireEnv(name, value) {
  if (!value || String(value).trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function parseMessage(body) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Invalid SQS message body: not JSON");
  }

  const {
    orderId,
    userEmail,
    userName,
    totalPrice,
    paidAt,
    items,
    shippingAddress,
    currency,
  } = parsed;

  if (!orderId || typeof orderId !== "string") {
    throw new Error("Invalid message: orderId required");
  }
  if (!userEmail || typeof userEmail !== "string") {
    throw new Error("Invalid message: userEmail required");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Invalid message: items required");
  }
  if (!shippingAddress || typeof shippingAddress !== "object") {
    throw new Error("Invalid message: shippingAddress required");
  }

  return {
    orderId,
    userEmail: userEmail.trim(),
    userName: typeof userName === "string" ? userName.trim() : "Customer",
    totalPrice: Number(totalPrice),
    paidAt: typeof paidAt === "string" ? paidAt : new Date().toISOString(),
    items,
    shippingAddress,
    currency: typeof currency === "string" ? currency : CURRENCY,
  };
}

function formatItems(items) {
  return items
    .map((item) => {
      const title = String(item.title ?? "Item");
      const qty = Number(item.quantity ?? 0);
      const price = Number(item.price ?? 0);
      return `  - ${title} x${qty} @ ${price.toFixed(2)}`;
    })
    .join("\n");
}

function formatAddress(addr) {
  const lines = [
    addr.name,
    addr.addressLine1,
    addr.addressLine2 || null,
    `${addr.postalCode} ${addr.city}`,
    addr.country,
  ].filter(Boolean);
  return lines.join("\n");
}

function buildEmailContent(msg) {
  const shortId = msg.orderId.slice(0, 8);
  const subject = `Payment received — Order ${shortId}`;
  const total =
    Number.isFinite(msg.totalPrice) ? msg.totalPrice.toFixed(2) : String(msg.totalPrice);

  const text = [
    `Hello ${msg.userName},`,
    "",
    `This is the test email. Thank you for your order at ${STORE_NAME}. We have received your dummy payment`,
    "",
    `Order ID: ${msg.orderId}`,
    `Paid at: ${msg.paidAt}`,
    "",
    "Items:",
    formatItems(msg.items),
    "",
    `Total: ${total} ${msg.currency}`,
    "",
    "Shipping address:",
    formatAddress(msg.shippingAddress),
    "",
    "If you have questions, reply to this email or contact us through the store website.",
  ].join("\n");

  return { subject, text };
}

function createTransport() {
  requireEnv("SMTP_HOST", SMTP_HOST);
  requireEnv("SMTP_USER", SMTP_USER);
  requireEnv("SMTP_PASSWORD", SMTP_PASSWORD);
  requireEnv("EMAIL_FROM", EMAIL_FROM);

  const port = SMTP_PORT ? Number(SMTP_PORT) : 587;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
}

export async function handler(event) {
  const records = event?.Records;
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("No SQS records in event");
  }

  const transport = createTransport();

  for (const record of records) {
    const msg = parseMessage(record.body);
    const { subject, text } = buildEmailContent(msg);

    await transport.sendMail({
      from: `"${STORE_NAME}" <${EMAIL_FROM}>`,
      to: msg.userEmail,
      subject,
      text,
    });

    console.log("Order confirmation email sent", {
      orderId: msg.orderId,
      to: msg.userEmail,
    });
  }
}
