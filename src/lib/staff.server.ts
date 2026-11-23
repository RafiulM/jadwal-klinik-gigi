import { ApiError } from "@/lib/api.server";
import { findDoctorByUserId } from "@/services/doctor.service.server";

type SessionUser = { id: string; role?: string | null };

/**
 * Data klinik (riwayat pasien, jadwal kontrol) hanya untuk staf: akun yang
 * ditautkan ke dokter aktif, atau akun ber-role admin. Akun biasa hasil
 * daftar sendiri ditolak 403.
 */
export async function requireClinicStaff(user: SessionUser) {
  const doctor = await findDoctorByUserId(user.id);
  if (doctor) return { doctor, isAdmin: hasRole(user, "admin") };
  if (hasRole(user, "admin")) return { doctor: null, isAdmin: true };
  throw new ApiError(403, "FORBIDDEN", "Data ini hanya untuk staf klinik.");
}

function hasRole(user: SessionUser, role: string) {
  return (user.role ?? "")
    .split(",")
    .map((value) => value.trim())
    .includes(role);
}
