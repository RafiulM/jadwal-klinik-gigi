import { createFileRoute, notFound } from "@tanstack/react-router";
import { hasPermissionFn } from "@/lib/session";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { SchedulePage } from "@/features/schedule/schedule-page";

// ?tanggal=YYYY-MM-DD&dokter=<id> — saringan tanggal dan dokter bisa dibagikan
// lewat tautan. Nilai yang tidak valid diabaikan.
const searchSchema = z.object({
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)))
    .optional()
    .catch(undefined),
  dokter: z.string().max(64).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/jadwal")({
  validateSearch: searchSchema,
  // Papan jadwal memuat data semua dokter: tanpa izin, halaman tidak ada.
  beforeLoad: async () => {
    if (!(await hasPermissionFn({ data: { schedule: ["read-any"] } })))
      throw notFound();
  },
  head: () => ({ meta: [{ title: `Papan jadwal | ${siteConfig.name}` }] }),
  component: SchedulePage,
});
