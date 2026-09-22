export async function api(path, body, method = "POST") {
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Fout");
  return data;
}

export async function logout() {
  const res = await fetch("/api/logout", {
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
    throw new Error(data.error || "Uitloggen is niet gelukt.");
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
    return await api("/api/me", null, "GET");
  } catch {
    return { paid: false };
  }
}

export function euro(n) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

export function gb(bytes) {
  return (Number(bytes || 0) / (1024 * 1024 * 1024)).toFixed(2);
}
