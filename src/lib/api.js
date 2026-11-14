const API_URL = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`The store API returned an invalid response (${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(payload.error || `The store API returned HTTP ${response.status}.`);
  }
  return payload;
}

export function readablePrice(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}
