// Klien browser bersama untuk API aplikasi: bentuk respons { data } / { error }.

export class ApiFailure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiFailure(
      0,
      "NETWORK_ERROR",
      "Tidak bisa terhubung ke klinik. Periksa koneksi internet Anda.",
    );
  }
  const body = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { code: string; message: string };
  } | null;
  if (!response.ok || !body || body.data === undefined)
    throw new ApiFailure(
      response.status,
      body?.error?.code ?? "UNKNOWN",
      body?.error?.message ?? "Terjadi kesalahan. Coba lagi.",
    );
  return body.data;
}

/** Kirim JSON (PATCH/PUT/POST) ke API aplikasi. */
export function apiSend<T>(url: string, method: string, body: unknown) {
  return apiRequest<T>(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function messageOf(error: unknown) {
  return error instanceof ApiFailure
    ? error.message
    : "Terjadi kesalahan. Coba lagi.";
}
