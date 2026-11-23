import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { LoginPage } from "@/features/access/login-page";

export const Route = createFileRoute("/masuk")({
  head: () => ({
    meta: [
      { title: `Masuk staf | ${siteConfig.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});
