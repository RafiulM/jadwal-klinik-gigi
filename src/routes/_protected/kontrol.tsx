import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { FollowUpPage } from "@/features/followup/followup-page";

export const Route = createFileRoute("/_protected/kontrol")({
  head: () => ({ meta: [{ title: `Kontrol pasien | ${siteConfig.name}` }] }),
  component: FollowUpPage,
});
