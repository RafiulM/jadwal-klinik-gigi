import { createFileRoute } from "@tanstack/react-router";
import { readJson, withClinicAdmin } from "@/lib/api.server";
import { clinicResponse } from "@/lib/clinic-errors.server";
import {
  createServiceAny,
  listServicesAny,
} from "@/services/clinic.service.server";
import { createServiceSchema } from "@/validators/clinic";

// GET  /api/admin/services → semua layanan (aktif dan tersembunyi)
// POST /api/admin/services   { name, description?, durationMinutes, followUpDays? }
export const Route = createFileRoute("/api/admin/services/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withClinicAdmin(request, async () =>
          Response.json({ data: await listServicesAny() }),
        ),
      POST: ({ request }) =>
        withClinicAdmin(request, async () => {
          const input = createServiceSchema.parse(await readJson(request));
          return clinicResponse(async () =>
            Response.json(
              { data: await createServiceAny(input) },
              { status: 201 },
            ),
          );
        }),
    },
  },
});
