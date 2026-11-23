import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { DoctorTodayPage } from "@/features/doctor/doctor-today-page";

export const Route = createFileRoute("/_protected/dokter")({
  head: () => ({ meta: [{ title: `Jadwal hari ini | ${siteConfig.name}` }] }),
  component: DoctorTodayPage,
});
