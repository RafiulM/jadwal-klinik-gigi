import { eq } from "drizzle-orm";
import { db } from "@/db/index.server";
import { doctors } from "@/db/schema";
import {
  homeForRoles,
  staffRoles,
  type StaffRole,
} from "@/features/access/roles";

/**
 * Profil staf yang sedang masuk: peran, halaman awal, dan data dokter yang
 * ditautkan (bila ada). Dipakai setelah kredensial diverifikasi Better Auth.
 */
export async function getStaffProfile(user: {
  id: string;
  name: string;
  email: string;
  role?: string | null;
}) {
  const roles: StaffRole[] = staffRoles(user.role);
  const [doctor] = await db
    .select({ id: doctors.id, name: doctors.name, isActive: doctors.isActive })
    .from(doctors)
    .where(eq(doctors.userId, user.id))
    .limit(1);
  return {
    name: user.name,
    email: user.email,
    roles,
    home: homeForRoles(roles) ?? "/tanpa-akses",
    doctor: doctor ?? null,
  };
}

export type StaffProfile = Awaited<ReturnType<typeof getStaffProfile>>;
