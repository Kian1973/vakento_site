const MOLLIE_API = "https://api.mollie.com/v2";

function clean(value) {
  return String(value ?? "").trim();
}

function getApiKey() {
  const key = clean(process.env.MOLLIE_API_KEY);
  if (!key) throw new Error("MOLLIE_API_KEY ontbreekt op de server.");
  if (!/^(test|live)_/.test(key)) {
    throw new Error("MOLLIE_API_KEY moet een Mollie test_ of live_ API-key zijn.");
  }
  return key;
}

function getBaseUrl() {
  return clean(process.env.VAKENTO_BASE_URL) || "https://vakento.nl";
}

function getProAmount() {
  // Vakento Pro: EUR 29,00 excl. 21% btw = EUR 35,09 incl. btw.
  return clean(process.env.VAKENTO_PRO_AMOUNT) || "35.09";
}

async function mollie(path, { method = "GET", body } = {}) {
  const res = await fetch(MOLLIE_API + path, {
    method,
    headers: {
      Authorization: "Bearer " + getApiKey(),
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const message =
      data?.detail ||
      data?.title ||
      data?.message ||
      `Mollie API gaf HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function createVakentoProPayment({
  userId,
  token,
  description = "Vakento Pro - 1 maand",
} = {}) {
  if (!userId) throw new Error("userId ontbreekt.");
  if (!token) throw new Error("betalingstoken ontbreekt.");

  const baseUrl = getBaseUrl();
  const redirect = new URL("/betaald.html", baseUrl);
  redirect.searchParams.set("token", token);

  const webhook = new URL("/api/pay/mollie/webhook", baseUrl);

  const payment = await mollie("/payments", {
    method: "POST",
    body: {
      amount: {
        currency: "EUR",
        value: getProAmount(),
      },
      description,
      redirectUrl: redirect.toString(),
      webhookUrl: webhook.toString(),
      locale: "nl_NL",
      metadata: {
        provider: "mollie",
        sku: "werkplaats",
        userId: String(userId),
        token: String(token),
      },
    },
  });

  const checkoutUrl = payment?._links?.checkout?.href;
  if (!checkoutUrl) throw new Error("Mollie gaf geen checkout-URL terug.");

  return {
    provider: "mollie",
    paymentId: payment.id,
    checkoutUrl,
    status: payment.status,
  };
}

export async function getMolliePayment(paymentId) {
  const id = clean(paymentId);
  if (!/^tr_/.test(id)) throw new Error("Ongeldig Mollie payment-id.");
  return mollie("/payments/" + encodeURIComponent(id));
}

export function isMolliePaymentPaid(payment) {
  return payment?.status === "paid";
}

export function molliePaymentMetadata(payment) {
  const metadata = payment?.metadata;
  if (!metadata || typeof metadata !== "object") return {};
  return metadata;
}
