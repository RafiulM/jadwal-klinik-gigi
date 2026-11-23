import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { requireStaffRole } from "@/features/access/guard";
import { PAGE_ROLES } from "@/features/access/roles";
import { FollowUpPage } from "@/features/followup/followup-page";

export const Route = createFileRoute("/_protected/kontrol")({
  beforeLoad: ({ context }) => {
    requireStaffRole(context, PAGE_ROLES["/kontrol"]);
  },
  head: () => ({ meta: [{ title: `Kontrol pasien | ${siteConfig.name}` }] }),
  component: FollowUpPage,
});
