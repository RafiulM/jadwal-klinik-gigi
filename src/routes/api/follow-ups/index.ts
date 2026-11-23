import { createFileRoute } from "@tanstack/react-router";
import { withApiPermission } from "@/lib/api.server";
import { clinicNow } from "@/lib/clinic-time";
import { listFollowUpsAny } from "@/services/follow-up.service.server";

// GET /api/follow-ups → { today, followUps }
// Semua jadwal kontrol yang masih berjalan (dan yang selesai 90 hari terakhir)
// untuk halaman Kontrol pasien. Khusus staf klinik; filter dilakukan di layar.
export const Route = createFileRoute("/api/follow-ups/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiPermission(request, { followUps: ["read-any"] }, async () => {
          const today = clinicNow().date;
          return Response.json({
            data: { today, followUps: await listFollowUpsAny(today) },
          });
        }),
    },
  },
});
