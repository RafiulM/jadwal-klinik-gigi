import { createFileRoute } from "@tanstack/react-router";
import { withApiSession } from "@/lib/api.server";
import { getStaffProfile } from "@/services/staff.service.server";

// GET /api/staff/me → { name, email, roles, home, doctor }
// Dipanggil halaman /masuk setelah Better Auth memverifikasi email & kata
// sandi (POST /api/auth/sign-in/email, dengan pembatasan laju) untuk
// menentukan halaman awal sesuai peran. Tanpa sesi: 401.
export const Route = createFileRoute("/api/staff/me")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) =>
          Response.json({ data: await getStaffProfile(session.user) }),
        ),
    },
  },
});
