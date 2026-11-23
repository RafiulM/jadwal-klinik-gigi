import { createFileRoute } from "@tanstack/react-router";
import { readJson, withClinicAdmin } from "@/lib/api.server";
import { clinicResponse } from "@/lib/clinic-errors.server";
import {
  deleteDoctorAny,
  updateDoctorAny,
} from "@/services/clinic.service.server";
import { clinicIdSchema, updateDoctorSchema } from "@/validators/clinic";

// PATCH  /api/admin/doctors/:id  { name?, specialization?, phone?, accountEmail?, serviceIds?, isActive? }
// DELETE /api/admin/doctors/:id  (hanya bila belum pernah punya janji temu)
export const Route = createFileRoute("/api/admin/doctors/$id")({
  server: {
    handlers: {
      PATCH: ({ request, params }) =>
        withClinicAdmin(request, async () => {
          const id = clinicIdSchema.parse(params.id);
          const input = updateDoctorSchema.parse(await readJson(request));
          return clinicResponse(async () =>
            Response.json({ data: await updateDoctorAny(id, input) }),
          );
        }),
      DELETE: ({ request, params }) =>
        withClinicAdmin(request, async () => {
          const id = clinicIdSchema.parse(params.id);
          return clinicResponse(async () => {
            await deleteDoctorAny(id);
            return new Response(null, { status: 204 });
          });
        }),
    },
  },
});
