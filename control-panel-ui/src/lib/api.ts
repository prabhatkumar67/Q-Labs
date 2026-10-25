const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    signal: options?.signal ?? AbortSignal.timeout(60000),
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = typeof body.detail === "string" ? body.detail
      : Array.isArray(body.detail) ? body.detail.map((item: { loc?: (string | number)[]; msg?: string }) => `${item.loc?.slice(1).join(" / ") || "Input"}: ${item.msg || "Invalid value"}`).join("; ")
      : `API error: ${res.status}`;
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}
