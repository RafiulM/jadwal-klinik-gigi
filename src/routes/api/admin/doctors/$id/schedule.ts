import { createFileRoute } from "@tanstack/react-router";
import { readJson, withClinicAdmin } from "@/lib/api.server";
import { clinicResponse } from "@/lib/clinic-errors.server";
import {
  getDoctorScheduleAny,
  saveDoctorScheduleAny,
} from "@/services/clinic.service.server";
import { clinicIdSchema, doctorScheduleSchema } from "@/validators/clinic";

// GET /api/admin/doctors/:id/schedule → { doctorId, slotIntervalMinutes, days[7] }
// PUT /api/admin/doctors/:id/schedule   { slotIntervalMinutes, days[7] }
//     → jadwal tersimpan + outsideHours (janji mendatang di luar jam baru)
export const Route = createFileRoute("/api/admin/doctors/$id/schedule")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withClinicAdmin(request, async () => {
          const id = clinicIdSchema.parse(params.id);
          return clinicResponse(async () =>
            Response.json({ data: await getDoctorScheduleAny(id) }),
          );
        }),
      PUT: ({ request, params }) =>
        withClinicAdmin(request, async () => {
          const id = clinicIdSchema.parse(params.id);
          const input = doctorScheduleSchema.parse(await readJson(request));
          return clinicResponse(async () =>
            Response.json({ data: await saveDoctorScheduleAny(id, input) }),
          );
        }),
    },
  },
});
