import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { StaffShell } from "@/components/staff-shell";
import { navForRoles, roleLabel, staffRoles } from "@/features/access/roles";

// Pathless layout for signed-in screens. The check runs on the server during
// SSR and again on client navigation. It protects pages only: API routes and
// server functions must verify the session themselves.
export const Route = createFileRoute("/_protected")({
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: "/masuk" });
    return { session: context.session };
  },
  component: ProtectedLayout,
});

// Menu dan label peran mengikuti user.role (dokter, admin, pemilik; bisa
// lebih dari satu). Menyembunyikan menu bukan pengaman: setiap halaman dan
// API tetap memeriksa izin sendiri.
function ProtectedLayout() {
  const { user } = Route.useRouteContext().session;
  const roles = staffRoles(user.role);
  return (
    <StaffShell
      user={user}
      roleLabel={roleLabel(roles)}
      nav={navForRoles(roles)}
    >
      <Outlet />
    </StaffShell>
  );
}
