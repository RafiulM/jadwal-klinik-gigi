import { ApiError } from "@/lib/api.server";
import { IntegrationError } from "@/services/integration.service.server";

const MESSAGES: Record<IntegrationError["reason"], [number, string]> = {
  NOT_FOUND: [404, "Data tidak ditemukan."],
  NOT_CLAIMED: [
    409,
    "Event ini tidak sedang diproses (mungkin sudah di-ack atau sewanya habis).",
  ],
  NOT_PENDING: [409, "Pasien sudah booking atau kontrol ini sudah selesai."],
};

/** Ubah IntegrationError dari service menjadi respons API. */
export async function integrationResponse(run: () => Promise<Response>) {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof IntegrationError)) throw error;
    const [status, message] = MESSAGES[error.reason];
    throw new ApiError(status, error.reason, message);
  }
}
