/** Typed access to Vite env vars (Stripe keys by deploy target, same as nest). */

export type DeployTarget = "ovh" | "aws";

const deployTarget: DeployTarget =
  import.meta.env.VITE_DEPLOY_TARGET === "aws" ? "aws" : "ovh";

const stripeKeyByTarget = {
  ovh: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST_MODE_OVH,
  aws: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST_MODE_AWS,
} as const;

export const env = {
  deployTarget,
  stripePublishableKey: stripeKeyByTarget[deployTarget] as string | undefined,
} as const;
