import { createFileRoute } from "@tanstack/react-router";
import { withApiSession } from "@/lib/api.server";
import { clinicNow } from "@/lib/clinic-time";
import { requireClinicStaff } from "@/lib/staff.server";
import { listFollowUps } from "@/services/follow-up.service.server";

// GET /api/follow-ups → { today, followUps }
// Semua jadwal kontrol yang masih berjalan (dan yang selesai 90 hari terakhir)
// untuk halaman Kontrol pasien. Khusus staf klinik; filter dilakukan di layar.
export const Route = createFileRoute("/api/follow-ups/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) => {
          await requireClinicStaff(session.user);
          const today = clinicNow().date;
          return Response.json({
            data: { today, followUps: await listFollowUps(today) },
          });
        }),
    },
  },
});
