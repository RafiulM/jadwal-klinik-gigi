import { createFileRoute } from "@tanstack/react-router";
import { withApiPermission } from "@/lib/api.server";
import { getScheduleAny } from "@/services/schedule.service.server";
import { scheduleQuerySchema } from "@/validators/schedule";

// GET /api/schedule?from=YYYY-MM-DD&days=7&doctorId=<uuid>
// Papan jadwal admin: janji temu semua dokter dalam rentang tanggal, dengan
// saringan dokter opsional. Butuh izin schedule:read-any.
export const Route = createFileRoute("/api/schedule/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiPermission(request, { schedule: ["read-any"] }, async () => {
          const query = scheduleQuerySchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return Response.json({ data: await getScheduleAny(query) });
        }),
    },
  },
});
