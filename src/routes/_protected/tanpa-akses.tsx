import { createFileRoute, redirect } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { siteConfig } from "@/config/site";
import { homeForRoles, staffRoles } from "@/features/access/roles";

// Akun yang sudah masuk tetapi belum diberi peran staf oleh admin.
export const Route = createFileRoute("/_protected/tanpa-akses")({
  head: () => ({ meta: [{ title: `Belum punya akses | ${siteConfig.name}` }] }),
  beforeLoad: ({ context }) => {
    const home = homeForRoles(staffRoles(context.session.user.role));
    if (home) throw redirect({ to: home, replace: true });
  },
  component: NoAccessPage,
});

function NoAccessPage() {
  const { user } = Route.useRouteContext().session;
  return (
    <div className="grid min-h-[70svh] place-items-center px-4 py-10">
      <section className="grid max-w-md justify-items-center gap-4 rounded-xl border bg-card px-6 py-10 text-center shadow-[0_1px_2px_rgb(27_36_33/0.05),0_8px_24px_rgb(27_36_33/0.05)]">
        <span
          aria-hidden="true"
          className="inline-flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning"
        >
          <ShieldOff className="size-6" />
        </span>
        <h1 className="text-xl font-bold tracking-tight">
          Akun Anda belum punya akses staf
        </h1>
        <p className="text-sm text-muted-foreground">
          {user.email} sudah terdaftar, tetapi admin klinik belum memberi peran
          dokter, admin, atau pemilik. Hubungi admin klinik, lalu muat ulang
          halaman ini.
        </p>
      </section>
    </div>
  );
}
