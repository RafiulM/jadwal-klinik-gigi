import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { requireStaffRole } from "@/features/access/guard";
import { FollowUpPage } from "@/features/followup/followup-page";

export const Route = createFileRoute("/_protected/kontrol")({
  beforeLoad: ({ context }) => {
    requireStaffRole(context, ["dokter", "admin"]);
  },
  head: () => ({ meta: [{ title: `Kontrol pasien | ${siteConfig.name}` }] }),
  component: FollowUpPage,
});
