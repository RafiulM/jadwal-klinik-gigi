import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { ManagePage } from "@/features/manage/manage-page";

export const Route = createFileRoute("/_protected/kelola")({
  head: () => ({ meta: [{ title: `Kelola klinik | ${siteConfig.name}` }] }),
  component: ManagePage,
});
