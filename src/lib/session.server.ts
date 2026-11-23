import { env } from "@/lib/env.server";
import { auth } from "@/lib/auth.server";
import type { Permissions } from "@/lib/permissions";

// Server-only session helpers. Routes reach these through the server
// functions in src/lib/session.ts, never by importing this file directly.
export function getSession(headers: Headers) {
  return auth.api.getSession({ headers });
}

// Reads the stored role, so a revoked role takes effect on the next request
// instead of when the session expires.
export async function hasPermission(userId: string, permissions: Permissions) {
  const { success } = await auth.api.userHasPermission({
    body: { userId, permissions },
  });
  return success;
}

/** Origin publik dari BETTER_AUTH_URL (alamat app yang dipakai pengunjung). */
export function siteOrigin() {
  return new URL(env.BETTER_AUTH_URL).origin;
}
