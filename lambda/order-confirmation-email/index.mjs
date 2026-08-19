import nodemailer from "nodemailer";

/**
 * Shared order-confirmation Lambda for nest + gql.
 * Keep this file identical in both repos.
 * Each AWS function still has its own SQS trigger / ORDER_CONFIRMATION_QUEUE_URL.
 *
 * Payload: language "pl" | "en" (default pl).
 * Address: gql { name, addressLine1, addressLine2, postalCode, city, country }
 *       or nest { address, city, code }.
 */

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_SECURE,
  EMAIL_FROM,
  MAIL_FROM_LOCAL,
  DOMAIN,
  CURRENCY = "PLN",
  STORE_NAME = "BookStore",
} = process.env;

function requireEnv(name, value) {
  if (!value || String(value).trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function resolveLanguage(raw) {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "en" ? "en" : "pl";
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
    itemsPrice,
    shippingPrice,
    totalPrice,
    paidAt,
    items,
    shippingAddress,
    currency,
    adminEmail,
    language,
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
    itemsPrice: Number(itemsPrice),
    shippingPrice: Number(shippingPrice),
    totalPrice: Number(totalPrice),
    paidAt: typeof paidAt === "string" ? paidAt : new Date().toISOString(),
    items,
    shippingAddress,
    currency: typeof currency === "string" && currency.trim() ? currency.trim() : CURRENCY,
    adminEmail:
      typeof adminEmail === "string" && adminEmail.trim()
        ? adminEmail.trim()
        : undefined,
    language: resolveLanguage(language),
  };
}

function formatItems(items, currency) {
  return items
    .map((item) => {
      const title = String(item.title ?? "Item");
      const qty = Number(item.quantity ?? 0);
      const price = Number(item.price ?? 0);
      return `  - ${title} x${qty} @ ${price.toFixed(2)} ${currency}`;
    })
    .join("\n");
}

function formatAddress(addr) {
  const line1 = addr.addressLine1 || addr.address;
  const postal = addr.postalCode || addr.code;
  const cityLine = [postal, addr.city].filter(Boolean).join(" ").trim();
  const lines = [
    addr.name,
    line1,
    addr.addressLine2 || null,
    cityLine || null,
    addr.country,
  ].filter(Boolean);
  return lines.join("\n");
}

function money(value) {
  return Number.isFinite(value) ? value.toFixed(2) : null;
}

function buildEmailContent(msg) {
  const shortId =
    msg.orderId.length > 8 ? msg.orderId.slice(-8) : msg.orderId;
  const itemsTotal = money(msg.itemsPrice);
  const shippingTotal = money(msg.shippingPrice);
  const orderTotal = money(msg.totalPrice) ?? String(msg.totalPrice);
  const cur = msg.currency;
  const address = formatAddress(msg.shippingAddress);
  const itemsBlock = formatItems(msg.items, cur);
  const pl = msg.language !== "en";

  const subject = pl
    ? `Potwierdzenie zakupu — zamówienie …${shortId}`
    : `Order confirmation — …${shortId}`;

  const totals = [];
  if (itemsTotal) {
    totals.push(pl ? `Produkty: ${itemsTotal} ${cur}` : `Items: ${itemsTotal} ${cur}`);
  }
  if (shippingTotal) {
    totals.push(pl ? `Dostawa: ${shippingTotal} ${cur}` : `Shipping: ${shippingTotal} ${cur}`);
  }
  totals.push(pl ? `Zapłacono: ${orderTotal} ${cur}` : `Paid: ${orderTotal} ${cur}`);

  const text = [
    pl ? `Witaj ${msg.userName},` : `Hello ${msg.userName},`,
    "",
    pl
      ? `Dziękujemy za zakup w ${STORE_NAME}. Otrzymaliśmy płatność za Twoje zamówienie.`
      : `Thank you for your order at ${STORE_NAME}. We have received your payment.`,
    "",
    pl ? `ID zamówienia: ${msg.orderId}` : `Order ID: ${msg.orderId}`,
    pl ? `Data: ${msg.paidAt}` : `Paid at: ${msg.paidAt}`,
    "",
    pl ? "Produkty:" : "Items:",
    itemsBlock,
    "",
    ...totals,
    "",
    pl ? "Adres dostawy:" : "Shipping address:",
    address,
    "",
    pl
      ? "W razie pytań odpowiedz na ten e-mail lub skontaktuj się przez stronę sklepu."
      : "If you have questions, reply to this email or contact us through the store website.",
  ].join("\n");

  return { subject, text };
}

function mailFrom() {
  if (EMAIL_FROM && EMAIL_FROM.trim()) {
    return EMAIL_FROM.trim();
  }
  if (DOMAIN && DOMAIN.trim()) {
    const local = (MAIL_FROM_LOCAL || "nest").trim();
    return `${local}@${DOMAIN.trim()}`;
  }
  throw new Error("Missing EMAIL_FROM or DOMAIN");
}

function createTransport() {
  requireEnv("SMTP_HOST", SMTP_HOST);
  requireEnv("SMTP_USER", SMTP_USER);
  requireEnv("SMTP_PASSWORD", SMTP_PASSWORD);
  mailFrom();

  const port = SMTP_PORT ? Number(SMTP_PORT) : 465;
  const secure =
    SMTP_SECURE === "true" || (SMTP_SECURE !== "false" && port === 465);

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    ...(port !== 465 && { requireTLS: true }),
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
  const from = `"${STORE_NAME}" <${mailFrom()}>`;

  for (const record of records) {
    const msg = parseMessage(record.body);
    const { subject, text } = buildEmailContent(msg);
    const to = msg.adminEmail
      ? `${msg.userEmail}, ${msg.adminEmail}`
      : msg.userEmail;

    await transport.sendMail({
      from,
      to,
      subject,
      text,
    });

    console.log("Order confirmation email sent", {
      orderId: msg.orderId,
      to: msg.userEmail,
      language: msg.language,
    });
  }
}
