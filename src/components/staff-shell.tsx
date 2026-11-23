import { useRef, useState, type ReactNode } from "react";
import {
  Link,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarClock,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

export type StaffNavItem = { to: string; label: string; icon: LucideIcon };

// Menu staf. Item lain (papan jadwal, kelola klinik, rekap) ditambahkan
// mengikuti peran saat fitur-fiturnya dibuat.
export const STAFF_NAV: StaffNavItem[] = [
  { to: "/dokter", label: "Jadwal hari ini", icon: CalendarCheck },
  { to: "/kontrol", label: "Kontrol pasien", icon: CalendarClock },
];

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter((w) => w && !w.endsWith("."))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?"
  );
}

export function StaffShell({
  user,
  roleLabel,
  nav = STAFF_NAV,
  children,
}: {
  user: { name: string; email: string };
  roleLabel: string;
  nav?: StaffNavItem[];
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-brand-deep px-4 py-2 text-on-brand-deep lg:hidden">
        <Link to="/" className="flex items-baseline gap-2 rounded-sm">
          <span className="text-lg font-bold tracking-tight">
            {siteConfig.name}
          </span>
          <span className="text-sm text-on-brand-deep-muted">Area staf</span>
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="staff-nav"
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex min-h-12 items-center gap-2 rounded-md border border-brand-deep-active bg-brand-deep-hover px-3 text-sm font-semibold hover:bg-brand-deep-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-brand-deep"
        >
          {menuOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
          Menu
        </button>
      </header>

      <aside
        id="staff-nav"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuOpen) {
            setMenuOpen(false);
            menuButtonRef.current?.focus();
          }
        }}
        className={cn(
          "flex-col gap-6 bg-brand-deep p-4 text-on-brand-deep",
          menuOpen
            ? "sticky top-16 z-20 flex shadow-[0_12px_24px_rgb(27_36_33/0.18)]"
            : "hidden",
          "lg:sticky lg:top-0 lg:flex lg:h-svh lg:px-4 lg:pt-8 lg:pb-5 lg:shadow-none",
        )}
      >
        <div className="hidden gap-1 px-3 lg:grid">
          <Link to="/" className="text-xl font-bold tracking-tight">
            {siteConfig.name}
          </Link>
          <p className="text-sm text-on-brand-deep-muted">Area staf</p>
        </div>

        <nav aria-label="Menu staf" className="grid gap-1">
          <p
            aria-hidden="true"
            className="mb-1 px-3 text-xs font-semibold tracking-wide text-on-brand-deep-muted uppercase"
          >
            Menu
          </p>
          {nav.map((item) => {
            const active =
              pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-brand-deep",
                  active
                    ? "bg-brand-deep-active font-semibold text-on-brand-deep"
                    : "font-medium text-on-brand-deep-muted hover:bg-brand-deep-hover hover:text-on-brand-deep",
                )}
              >
                <item.icon className="size-[18px]" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-3 rounded-md bg-brand-deep-hover p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-deep-active text-sm font-bold"
            >
              {initialsOf(user.name)}
            </span>
            <div className="grid min-w-0">
              <p className="text-sm font-semibold [overflow-wrap:anywhere]">
                {user.name}
              </p>
              <p className="text-xs text-on-brand-deep-muted">{roleLabel}</p>
            </div>
          </div>
          <StaffSignOut />
        </div>
      </aside>

      <main id="main-content" className="min-w-0">
        {children}
      </main>
    </div>
  );
}

function StaffSignOut() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  const navigate = useNavigate();
  async function signOut() {
    setPending(true);
    setError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign out failed");
      await router.invalidate();
      await navigate({ to: "/sign-in", replace: true });
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      {error ? (
        <p role="alert" className="px-3 text-xs text-on-brand-deep">
          Gagal keluar. Coba lagi.
        </p>
      ) : null}
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-on-brand-deep-muted hover:bg-brand-deep-active hover:text-on-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-brand-deep disabled:opacity-70"
      >
        <LogOut className="size-[18px]" aria-hidden="true" />
        {pending ? "Keluar…" : "Keluar"}
      </button>
    </>
  );
}
