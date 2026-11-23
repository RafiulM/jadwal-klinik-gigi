import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { SchedulePage } from "@/features/schedule/schedule-page";

export const Route = createFileRoute("/_protected/jadwal")({
  head: () => ({ meta: [{ title: `Papan jadwal | ${siteConfig.name}` }] }),
  component: SchedulePage,
});
