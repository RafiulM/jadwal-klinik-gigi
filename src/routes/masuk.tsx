import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { LoginPage } from "@/features/access/login-page";
import { homeForRoles, staffRoles } from "@/features/access/roles";

export const Route = createFileRoute("/masuk")({
  // ?keluar=1 menampilkan konfirmasi setelah keluar.
  validateSearch: z.object({
    keluar: z.coerce.number().int().optional().catch(undefined),
  }),
  // Yang sudah masuk langsung ke halaman awal perannya.
  beforeLoad: ({ context }) => {
    if (context.session)
      throw redirect({
        to:
          homeForRoles(staffRoles(context.session.user.role)) ?? "/tanpa-akses",
        replace: true,
      });
  },
  head: () => ({
    meta: [
      { title: `Masuk staf | ${siteConfig.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});
