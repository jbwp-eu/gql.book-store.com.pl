type PayPalMode = "sandbox" | "live";

type AccessTokenResponse = {
  access_token?: string;
};

type CreateOrderResponse = {
  id?: string;
};

type CaptureOrderResponse = {
  status?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: {
          currency_code?: string;
          value?: string;
        };
      }>;
    };
  }>;
};

export type CapturedPayPalOrder = {
  captureId: string;
  captureStatus: string;
  orderStatus: string;
  amountCurrencyCode: string;
  amountValue: string;
};

function resolvePayPalMode(): PayPalMode {
  const modeRaw = String(process.env.PAYPAL_MODE ?? "sandbox")
    .trim()
    .toLowerCase();
  if (modeRaw === "sandbox" || modeRaw === "live") {
    return modeRaw;
  }
  throw new Error("PAYPAL_MODE must be either 'sandbox' or 'live'.");
}

function getPayPalBaseUrl(): string {
  return resolvePayPalMode() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getPayPalCredentials(): { clientId: string; clientSecret: string } {
  const clientId = String(process.env.PAYPAL_CLIENT_ID ?? "").trim();
  const clientSecret = String(process.env.PAYPAL_CLIENT_SECRET ?? "").trim();
  if (!clientId || !clientSecret) {
    throw new Error("PayPal is not configured on the server.");
  }
  return { clientId, clientSecret };
}

async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getPayPalCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Language": "en_US",
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = (await response.json()) as AccessTokenResponse;
  if (!response.ok || !json.access_token) {
    throw new Error("Failed to authenticate with PayPal.");
  }
  return json.access_token;
}

export async function createPayPalCheckoutOrder(params: {
  amountValue: string;
  currencyCode: string;
}): Promise<{ orderId: string }> {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: params.currencyCode,
            value: params.amountValue,
          },
        },
      ],
    }),
  });
  const json = (await response.json()) as CreateOrderResponse;
  if (!response.ok || !json.id) {
    throw new Error("Failed to create PayPal order.");
  }
  return { orderId: json.id };
}

export async function capturePayPalOrder(
  paypalOrderId: string
): Promise<CapturedPayPalOrder> {
  const token = await getPayPalAccessToken();
  const response = await fetch(
    `${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const json = (await response.json()) as CaptureOrderResponse;
  const capture = json.purchase_units?.[0]?.payments?.captures?.[0];
  if (
    !response.ok ||
    !json.status ||
    !capture?.id ||
    !capture.status ||
    !capture.amount?.currency_code ||
    !capture.amount?.value
  ) {
    throw new Error("Failed to capture PayPal order.");
  }
  return {
    captureId: capture.id,
    captureStatus: capture.status,
    orderStatus: json.status,
    amountCurrencyCode: capture.amount.currency_code,
    amountValue: capture.amount.value,
  };
}
