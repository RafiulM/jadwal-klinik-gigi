import { createFileRoute, notFound } from "@tanstack/react-router";
import { hasPermissionFn } from "@/lib/session";
import { siteConfig } from "@/config/site";
import { requireStaffRole } from "@/features/access/guard";
import { PAGE_ROLES } from "@/features/access/roles";
import { FollowUpPage } from "@/features/followup/followup-page";

export const Route = createFileRoute("/_protected/kontrol")({
  beforeLoad: async ({ context }) => {
    requireStaffRole(context, PAGE_ROLES["/kontrol"]);
    if (!(await hasPermissionFn({ data: { followUps: ["read-any"] } })))
      throw notFound();
  },
  head: () => ({ meta: [{ title: `Kontrol pasien | ${siteConfig.name}` }] }),
  component: FollowUpPage,
});
