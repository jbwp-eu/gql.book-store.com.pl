/** Stripe env selection by DEPLOY_TARGET (same convention as nest.book-store.com.pl). */

export type DeployTarget = "ovh" | "aws";

export function getDeployTarget(): DeployTarget {
  return process.env.DEPLOY_TARGET === "aws" ? "aws" : "ovh";
}

export function stripeEnv(
  base: "STRIPE_SECRET_KEY_TEST_MODE" | "STRIPE_WEBHOOK_SECRET_TEST_MODE"
): string | undefined {
  const suffix = getDeployTarget() === "aws" ? "AWS" : "OVH";
  const value = process.env[`${base}_${suffix}`];
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}

/** Local `stripe listen` secret; used in dev only (production + tests use Dashboard OVH/AWS). */
export function stripeWebhookSecret(): string | undefined {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv !== "production" && nodeEnv !== "test") {
    const cli = process.env.STRIPE_WEBHOOK_SECRET_TEST_MODE_CLI?.trim();
    if (cli) {
      return cli;
    }
  }
  return stripeEnv("STRIPE_WEBHOOK_SECRET_TEST_MODE");
}
