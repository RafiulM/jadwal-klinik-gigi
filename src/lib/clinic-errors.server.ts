import { ApiError } from "@/lib/api.server";
import { ClinicError } from "@/services/clinic.service.server";

const CLINIC_ERRORS: Record<ClinicError["reason"], [number, string]> = {
  NOT_FOUND: [404, "Data tidak ditemukan."],
  SERVICE_NAME_TAKEN: [409, "Nama layanan ini sudah dipakai."],
  SERVICE_IN_USE: [
    409,
    "Layanan sudah dipakai janji temu. Sembunyikan dari booking saja agar riwayat pasien tetap utuh.",
  ],
  SERVICE_UNKNOWN: [422, "Ada layanan yang tidak dikenal."],
  DOCTOR_EMAIL_UNKNOWN: [
    422,
    "Belum ada akun dengan email ini. Minta dokter mendaftar dulu lewat halaman Daftar.",
  ],
  DOCTOR_EMAIL_TAKEN: [409, "Email ini sudah ditautkan ke dokter lain."],
};

/** Ubah ClinicError dari service menjadi respons API berbahasa Indonesia. */
export async function clinicResponse(run: () => Promise<Response>) {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof ClinicError)) throw error;
    const [status, message] = CLINIC_ERRORS[error.reason];
    throw new ApiError(status, error.reason, message);
  }
}
