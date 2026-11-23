import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { StaffShell } from "@/components/staff-shell";

// Pathless layout for signed-in screens. The check runs on the server during
// SSR and again on client navigation. It protects pages only: API routes and
// server functions must verify the session themselves.
export const Route = createFileRoute("/_protected")({
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: "/sign-in" });
    return { session: context.session };
  },
  component: ProtectedLayout,
});

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  dokter: "Dokter",
  pemilik: "Pemilik",
};

function ProtectedLayout() {
  const { user } = Route.useRouteContext().session;
  const role = (user.role ?? "").split(",")[0]?.trim() ?? "";
  return (
    <StaffShell user={user} roleLabel={ROLE_LABELS[role] ?? "Staf klinik"}>
      <Outlet />
    </StaffShell>
  );
}
