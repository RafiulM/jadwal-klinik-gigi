import { redirect } from "@tanstack/react-router";
import { homeForRoles, staffRoles, type StaffRole } from "./roles";

type GuardContext = {
  session: { user: { role?: string | null } } | null;
};

/**
 * Penjaga halaman staf berdasarkan peran di sesi. Dipakai di beforeLoad:
 * - belum masuk → /masuk
 * - punya peran lain → diarahkan ke halaman awal perannya
 * - belum punya peran staf → /tanpa-akses
 * Ini hanya kenyamanan navigasi; API tetap memeriksa izin sendiri.
 */
export function requireStaffRole(context: GuardContext, allowed: StaffRole[]) {
  if (!context.session) throw redirect({ to: "/masuk" });
  const roles = staffRoles(context.session.user.role);
  if (roles.some((role) => allowed.includes(role))) return roles;
  const home = homeForRoles(roles);
  throw redirect({ to: home ?? "/tanpa-akses", replace: true });
}
