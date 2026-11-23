// Masuk staf lewat Better Auth (email + kata sandi), lalu baca peran dari
// sesi untuk menentukan halaman awal.
import { authClient } from "@/lib/auth-client";
import { homeForRoles, staffRoles } from "./roles";

export class SignInFailure extends Error {}

export const accessApi = {
  async signIn(email: string, password: string) {
    const result = await authClient.signIn.email({ email, password });
    if (result.error)
      throw new SignInFailure(
        result.error.status === 429
          ? "Terlalu banyak percobaan masuk"
          : "Email atau kata sandi salah",
      );
    const session = await authClient.getSession();
    const roles = staffRoles(session.data?.user.role);
    return { roles, home: homeForRoles(roles) ?? "/tanpa-akses" };
  },
};
