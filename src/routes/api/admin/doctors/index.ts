import { createFileRoute } from "@tanstack/react-router";
import { readJson, withClinicAdmin } from "@/lib/api.server";
import { clinicResponse } from "@/lib/clinic-errors.server";
import {
  createDoctorAny,
  listDoctorsAny,
} from "@/services/clinic.service.server";
import { createDoctorSchema } from "@/validators/clinic";

// GET  /api/admin/doctors → semua dokter dengan kontak, layanan, dan akun login
// POST /api/admin/doctors   { name, specialization?, phone?, accountEmail?, serviceIds }
export const Route = createFileRoute("/api/admin/doctors/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withClinicAdmin(request, async () =>
          Response.json({ data: await listDoctorsAny() }),
        ),
      POST: ({ request }) =>
        withClinicAdmin(request, async () => {
          const input = createDoctorSchema.parse(await readJson(request));
          return clinicResponse(async () =>
            Response.json(
              { data: await createDoctorAny(input) },
              { status: 201 },
            ),
          );
        }),
    },
  },
});
