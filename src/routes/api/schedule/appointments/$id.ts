import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiPermission } from "@/lib/api.server";
import { getScheduleAppointmentAny } from "@/services/schedule.service.server";
import { scheduleAppointmentIdSchema } from "@/validators/schedule";

// GET /api/schedule/appointments/:id — detail satu janji temu untuk admin.
export const Route = createFileRoute("/api/schedule/appointments/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiPermission(request, { schedule: ["read-any"] }, async () => {
          const id = scheduleAppointmentIdSchema.parse(params.id);
          const appointment = await getScheduleAppointmentAny(id);
          if (!appointment)
            throw new ApiError(404, "NOT_FOUND", "Janji temu tidak ditemukan.");
          return Response.json({ data: appointment });
        }),
    },
  },
});
