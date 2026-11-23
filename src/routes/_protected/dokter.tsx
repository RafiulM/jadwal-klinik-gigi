import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { requireStaffRole } from "@/features/access/guard";
import { PAGE_ROLES } from "@/features/access/roles";
import { DoctorTodayPage } from "@/features/doctor/doctor-today-page";

export const Route = createFileRoute("/_protected/dokter")({
  beforeLoad: ({ context }) => {
    requireStaffRole(context, PAGE_ROLES["/dokter"]);
  },
  head: () => ({ meta: [{ title: `Jadwal hari ini | ${siteConfig.name}` }] }),
  component: DoctorTodayPage,
});
