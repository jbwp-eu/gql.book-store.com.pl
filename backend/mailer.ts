import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_SECURE,
  EMAIL_FROM,
  CONTACT_RECIPIENT,
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
  console.warn(
    "[mailer] SMTP configuration is incomplete. Contact emails will fail until all variables are set."
  );
}

if (!EMAIL_FROM || !CONTACT_RECIPIENT) {
  console.warn(
    "[mailer] EMAIL_FROM or CONTACT_RECIPIENT is not configured. Contact emails will fail until they are set."
  );
}

const transport = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT ? Number(SMTP_PORT) : 587,
  secure: SMTP_SECURE === "true",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

type SendContactEmailArgs = {
  fromEmail: string;
  message: string;
};

export async function sendContactEmail({
  fromEmail,
  message,
}: SendContactEmailArgs) {
  if (!EMAIL_FROM || !CONTACT_RECIPIENT) {
    throw new Error("Contact email not configured on server");
  }

  const subject = `New contact message from ${fromEmail}`;

  await transport.sendMail({
    // from: `"📬" ${EMAIL_FROM}`,
    // Some fancier icons to choose from:
    // "📚", "🦉", "📨", "✉️", "📝", "🕮", "💌", "🔔"
    // Uncomment one of the lines below to use a different icon:
    from: `"📚 Book Store" <${EMAIL_FROM}>`,
    // from: `"🦉 Book Store" <${EMAIL_FROM}>`,
    // from: `"📨 Book Store" <${EMAIL_FROM}>`,
    // from: `"✉️ Book Store" <${EMAIL_FROM}>`,
    // from: `"📝 Book Store" <${EMAIL_FROM}>`,
    // from: `"💌 Book Store" <${EMAIL_FROM}>`,
    to: CONTACT_RECIPIENT,
    replyTo: fromEmail,
    subject,
    text: `You have received a new contact message.\n\nFrom: ${fromEmail}\n\nMessage:\n${message}`,
  });
}
