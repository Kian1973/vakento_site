function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestOnce(path, body, method) {
  const res = await fetch(path, {
    method,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = {};
  if (text) {
    try { data = JSON.parse(text); }
    catch {
      const err = new Error(res.ok ? "Ongeldig antwoord van de server." : "Server gaf geen geldig API-antwoord.");
      err.status = res.status;
      err.body = text.slice(0, 500);
      throw err;
    }
  }

  if (!res.ok) {
    const err = new Error(data.error || data.message || "Fout");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function api(path, body, method = "POST") {
  const verb = String(method || "POST").toUpperCase();
  const maxAttempts = verb === "GET" ? 3 : 1;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await requestOnce(path, body, verb);
    } catch (err) {
      lastError = err;
      window.VakentoHeal?.report?.(err, { kind: "api", path, method: verb, attempt });

      const retryableStatus = [408, 429, 502, 503, 504].includes(Number(err?.status));
      const networkError = !err?.status && /fetch|network|load|connection/i.test(String(err?.message || err));
      const mayRetry = verb === "GET" && attempt < maxAttempts && (retryableStatus || networkError);

      if (!mayRetry) throw err;
      await sleep(attempt === 1 ? 350 : 1000);
    }
  }

  throw lastError || new Error("API-aanroep mislukt.");
}

export async function logout() {
  const res = await fetch("/api/logout?t=" + Date.now(), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
    body: "{}",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || "Uitloggen is niet gelukt.");
    window.VakentoHeal?.report?.(err, { kind: "logout", status: res.status });
    throw err;
  }

  try {
    sessionStorage.removeItem("vakento.uid");
    sessionStorage.removeItem("vakento.firm");
    localStorage.removeItem("vakento.uid");
    localStorage.removeItem("vakento.firm");
  } catch (_) {}
}

export async function me() {
  try {
    return await api("/api/me?t=" + Date.now(), null, "GET");
  } catch (err) {
    window.VakentoHeal?.report?.(err, { kind: "session-check" });
    return { paid: false };
  }
}

export function euro(n) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

export function gb(bytes) {
  return (Number(bytes || 0) / (1024 * 1024 * 1024)).toFixed(2);
}
