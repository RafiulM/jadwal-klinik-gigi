// Masuk staf: Better Auth memverifikasi email & kata sandi (dengan batas
// laju), lalu /api/staff/me memberi peran dan halaman awal akun.
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api-client";
import type { StaffRole } from "./roles";

export class SignInFailure extends Error {}

export type StaffProfile = {
  name: string;
  email: string;
  roles: StaffRole[];
  home: string;
  doctor: { id: string; name: string; isActive: boolean } | null;
};

export const accessApi = {
  me: () => apiRequest<StaffProfile>("/api/staff/me"),
  async signIn(email: string, password: string) {
    const result = await authClient.signIn.email({ email, password });
    if (result.error)
      throw new SignInFailure(
        result.error.status === 429
          ? "Terlalu banyak percobaan masuk"
          : result.error.code === "BANNED_USER"
            ? "Akun ini dinonaktifkan"
            : "Email atau kata sandi salah",
      );
    return accessApi.me();
  },
};
