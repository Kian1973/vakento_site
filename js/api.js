export async function api(path, body, method = "POST") {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Fout");
  return data;
}

export async function logout() {
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch (_) {}
  try {
    sessionStorage.removeItem("vakento.uid");
    sessionStorage.removeItem("vakento.firm");
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
