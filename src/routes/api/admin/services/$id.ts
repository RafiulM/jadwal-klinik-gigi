import { createFileRoute } from "@tanstack/react-router";
import { readJson, withClinicAdmin } from "@/lib/api.server";
import { clinicResponse } from "@/lib/clinic-errors.server";
import {
  deleteServiceAny,
  updateServiceAny,
} from "@/services/clinic.service.server";
import { clinicIdSchema, updateServiceSchema } from "@/validators/clinic";

// PATCH  /api/admin/services/:id  { name?, description?, durationMinutes?, followUpDays?, isActive? }
// DELETE /api/admin/services/:id  (hanya bila belum pernah dipakai)
export const Route = createFileRoute("/api/admin/services/$id")({
  server: {
    handlers: {
      PATCH: ({ request, params }) =>
        withClinicAdmin(request, async () => {
          const id = clinicIdSchema.parse(params.id);
          const input = updateServiceSchema.parse(await readJson(request));
          return clinicResponse(async () =>
            Response.json({ data: await updateServiceAny(id, input) }),
          );
        }),
      DELETE: ({ request, params }) =>
        withClinicAdmin(request, async () => {
          const id = clinicIdSchema.parse(params.id);
          return clinicResponse(async () => {
            await deleteServiceAny(id);
            return new Response(null, { status: 204 });
          });
        }),
    },
  },
});
