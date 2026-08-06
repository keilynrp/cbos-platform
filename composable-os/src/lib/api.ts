const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:8100/api/v1";

// ── Token helpers ──────────────────────────────────────────────────────────
const TOKEN_KEY = "cbos_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Error de la API que conserva el `code` de CBOSException.
 *
 * Antes se lanzaba un Error pelado con el mensaje, de modo que el codigo se
 * perdia y el frontend solo podia mostrar la prosa que escribiera el backend.
 * Con el codigo disponible, `translateApiError` puede resolver el texto en
 * espanol; `message` sigue siendo el del backend y hace de reserva cuando el
 * codigo no esta mapeado. Ver ADR 0010.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly detail?: Record<string, unknown>,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Core fetch wrapper ─────────────────────────────────────────────────────
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // CBOSException: { error: { code, message, detail } }
    // HTTPException: { detail: "string" | [...] }
    const message =
      body?.error?.message ??
      (typeof body?.detail === "string" ? body.detail : null) ??
      `HTTP ${res.status}`;
    throw new ApiError(message, body?.error?.code, body?.error?.detail, res.status);
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

// ── Public API object ──────────────────────────────────────────────────────
export const api = {
  get: <T>(path: string) =>
    request<T>(path, { method: "GET" }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body != null ? JSON.stringify(body) : undefined }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),

  delete: (path: string) =>
    request<void>(path, { method: "DELETE" }),
};
