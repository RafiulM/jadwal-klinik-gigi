import { createFileRoute } from "@tanstack/react-router";
import { SignUpForm } from "@/components/auth-form";
import { siteConfig } from "@/config/site";

export const Route = createFileRoute("/_auth/sign-up")({
  head: () => ({ meta: [{ title: `Buat akun staf | ${siteConfig.name}` }] }),
  component: SignUpForm,
});
