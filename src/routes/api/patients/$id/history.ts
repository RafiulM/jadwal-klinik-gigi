import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { requireClinicStaff } from "@/lib/staff.server";
import { getPatientHistory } from "@/services/follow-up.service.server";
import { patientIdSchema } from "@/validators/follow-up";

// GET /api/patients/:id/history → { patient, visits, followUps }
// Riwayat kunjungan dan kontrol satu pasien. Khusus staf klinik (dokter yang
// tertaut atau admin); nomor HP disamarkan.
export const Route = createFileRoute("/api/patients/$id/history")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiSession(request, async (session) => {
          await requireClinicStaff(session.user);
          const id = patientIdSchema.parse(params.id);
          const history = await getPatientHistory(id);
          if (!history)
            throw new ApiError(404, "NOT_FOUND", "Pasien tidak ditemukan.");
          return Response.json({ data: history });
        }),
    },
  },
});
