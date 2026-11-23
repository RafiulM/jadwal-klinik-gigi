import { createFileRoute, notFound } from "@tanstack/react-router";
import { hasPermissionFn } from "@/lib/session";
import { siteConfig } from "@/config/site";
import { requireStaffRole } from "@/features/access/guard";
import { ManagePage } from "@/features/manage/manage-page";

export const Route = createFileRoute("/_protected/kelola")({
  // Kelola klinik hanya untuk admin; akun lain melihat halaman tidak ditemukan.
  beforeLoad: async ({ context }) => {
    requireStaffRole(context, ["admin"]);
    if (!(await hasPermissionFn({ data: { clinic: ["manage"] } })))
      throw notFound();
  },
  head: () => ({ meta: [{ title: `Kelola klinik | ${siteConfig.name}` }] }),
  component: ManagePage,
});
