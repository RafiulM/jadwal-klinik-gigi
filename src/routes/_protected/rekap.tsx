import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { hasPermissionFn } from "@/lib/session";
import { siteConfig } from "@/config/site";
import { requireStaffRole } from "@/features/access/guard";
import { PAGE_ROLES } from "@/features/access/roles";
import { ReportPage } from "@/features/report/report-page";

export const Route = createFileRoute("/_protected/rekap")({
  // ?tanggal=YYYY-MM-DD: jendela 8 hari berakhir di tanggal itu.
  validateSearch: z.object({
    tanggal: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)))
      .optional()
      .catch(undefined),
  }),
  beforeLoad: async ({ context }) => {
    requireStaffRole(context, PAGE_ROLES["/rekap"]);
    if (!(await hasPermissionFn({ data: { reports: ["read"] } })))
      throw notFound();
  },
  head: () => ({ meta: [{ title: `Rekap harian | ${siteConfig.name}` }] }),
  component: ReportPage,
});
