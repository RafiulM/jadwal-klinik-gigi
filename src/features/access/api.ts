// Masuk staf. Sementara memakai data tiruan sampai peran staf tersedia di
// backend fase 4: dokter@, admin@, atau pemilik@klinik.test dengan kata
// sandi minimal 8 karakter.
import type { StaffRole } from "./roles";

export class SignInFailure extends Error {}

const mock = {
  async signIn(email: string, password: string): Promise<{ role: StaffRole }> {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const match = /^(dokter|admin|pemilik)@klinik\.test$/i.exec(email.trim());
    if (!match || password.length < 8)
      throw new SignInFailure("Email atau kata sandi salah");
    return { role: match[1].toLowerCase() as StaffRole };
  },
};

export const accessApi = mock;
