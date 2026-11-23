import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  Settings2,
  type LucideIcon,
} from "lucide-react";

// Peran staf klinik dan halaman awal masing-masing setelah masuk.
export type StaffRole = "dokter" | "admin" | "pemilik";

export const ROLE_INFO: Record<
  StaffRole,
  { label: string; home: string; icon: LucideIcon; summary: string }
> = {
  dokter: {
    label: "Dokter",
    home: "/dokter",
    icon: CalendarCheck,
    summary: "Jadwal pasien hari ini, catatan, dan kontrol berikutnya.",
  },
  admin: {
    label: "Admin",
    home: "/jadwal",
    icon: CalendarDays,
    summary: "Papan jadwal klinik, layanan, dokter, dan jam praktik.",
  },
  pemilik: {
    label: "Pemilik",
    home: "/rekap",
    icon: ChartColumn,
    summary: "Rekap kunjungan harian dan unduh laporan.",
  },
};

export type StaffNavItem = { to: string; label: string; icon: LucideIcon };

const NAV: Record<StaffRole, StaffNavItem[]> = {
  dokter: [
    { to: "/dokter", label: "Jadwal hari ini", icon: CalendarCheck },
    { to: "/kontrol", label: "Kontrol pasien", icon: CalendarClock },
  ],
  admin: [
    { to: "/jadwal", label: "Papan jadwal", icon: CalendarDays },
    { to: "/kontrol", label: "Kontrol pasien", icon: CalendarClock },
    { to: "/kelola", label: "Kelola klinik", icon: Settings2 },
  ],
  pemilik: [
    { to: "/rekap", label: "Rekap harian", icon: ChartColumn },
    { to: "/jadwal", label: "Papan jadwal", icon: CalendarDays },
  ],
};

const ORDER: StaffRole[] = ["dokter", "admin", "pemilik"];

/** Peran staf dari kolom user.role (bisa "admin,dokter"). Peran lain diabaikan. */
export function staffRoles(role: string | null | undefined): StaffRole[] {
  const values = (role ?? "").split(",").map((value) => value.trim());
  return ORDER.filter((r) => values.includes(r));
}

/** Menu gabungan semua peran akun, tanpa duplikat, urut sesuai peran. */
export function navForRoles(roles: StaffRole[]): StaffNavItem[] {
  const seen = new Set<string>();
  return roles
    .flatMap((r) => NAV[r])
    .filter((item) => !seen.has(item.to) && seen.add(item.to));
}

export function roleLabel(roles: StaffRole[]) {
  return roles.length
    ? roles.map((r) => ROLE_INFO[r].label).join(" · ")
    : "Belum punya akses staf";
}

/** Halaman awal akun: halaman peran pertama, atau null bila bukan staf. */
export function homeForRoles(roles: StaffRole[]) {
  return roles.length ? ROLE_INFO[roles[0]].home : null;
}

/**
 * Peran yang boleh membuka tiap halaman staf. Satu sumber untuk penjaga rute
 * (requireStaffRole) dan menu; API tetap memeriksa izin sendiri.
 */
export const PAGE_ROLES = {
  "/dokter": ["dokter"],
  "/kontrol": ["dokter", "admin"],
  "/jadwal": ["admin", "pemilik"],
  "/kelola": ["admin"],
  "/rekap": ["pemilik"],
} satisfies Record<string, StaffRole[]>;
