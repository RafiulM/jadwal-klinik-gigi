import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Link,
  getRouteApi,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  Lock,
  LogIn,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { accessApi, SignInFailure } from "./api";
import { ROLE_INFO, roleLabel, type StaffRole } from "./roles";

const route = getRouteApi("/masuk");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const input =
  "min-h-12 w-full rounded-md border border-border-strong bg-card pr-3 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-70 aria-invalid:border-destructive";

/** Halaman masuk staf (dokter, admin, pemilik). Pasien tidak perlu akun. */
export function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { keluar } = route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tried, setTried] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [failure, setFailure] = useState("");
  const [roles, setRoles] = useState<StaffRole[] | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "error") alertRef.current?.focus();
  }, [status]);

  const emailError = !email.trim()
    ? "Isi email Anda."
    : !EMAIL.test(email.trim())
      ? "Format email belum benar, contoh nama@klinik.test."
      : "";
  const passwordError = password ? "" : "Isi kata sandi Anda.";
  const showEmailError = tried ? emailError : "";
  const showPasswordError = tried ? passwordError : "";
  const busy = status === "loading" || status === "success";

  function edited() {
    if (status === "error") setStatus("idle");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setTried(true);
    if (emailError) return emailRef.current?.focus();
    if (passwordError) return passwordRef.current?.focus();
    setStatus("loading");
    try {
      const result = await accessApi.signIn(email.trim(), password);
      setRoles(result.roles);
      setStatus("success");
      // Muat ulang penjaga rute dengan cookie sesi baru.
      await router.invalidate();
      await navigate({ to: result.home, replace: true });
    } catch (error) {
      setFailure(
        error instanceof SignInFailure
          ? error.message
          : "Tidak bisa terhubung ke klinik. Periksa koneksi lalu coba lagi.",
      );
      setStatus("error");
    }
  }

  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="flex flex-col gap-8 bg-brand-deep px-5 pt-6 pb-8 text-on-brand-deep md:px-10 md:pt-10 lg:min-h-svh lg:justify-center lg:px-14">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-lg font-bold tracking-tight">{siteConfig.name}</p>
          <p className="text-sm text-on-brand-deep-muted">Area staf</p>
        </div>
        <div className="grid gap-3">
          <h1 className="text-2xl leading-tight font-bold tracking-tight lg:text-4xl">
            Selamat datang kembali
          </h1>
          <p className="text-on-brand-deep-muted">
            Masuk untuk melihat menu sesuai peran Anda di klinik.
          </p>
        </div>
        <ul className="hidden gap-5 lg:grid">
          {(Object.keys(ROLE_INFO) as StaffRole[]).map((key) => {
            const info = ROLE_INFO[key];
            return (
              <li
                key={key}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-10 items-center justify-center rounded-md bg-brand-deep-active"
                >
                  <info.icon className="size-5" />
                </span>
                <span className="grid gap-1">
                  <span className="font-semibold">{info.label}</span>
                  <span className="text-sm text-on-brand-deep-muted">
                    {info.summary}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <main
        id="main-content"
        className="-mt-6 grid content-center justify-items-center px-4 pb-10 md:px-8 lg:mt-0 lg:py-10"
      >
        <section
          aria-labelledby="masuk-title"
          className="grid w-full max-w-md gap-6 rounded-xl border bg-card px-5 py-6 shadow-[0_1px_2px_rgb(27_36_33/0.06),0_12px_32px_rgb(27_36_33/0.08)] md:px-8 md:py-8"
        >
          <div className="grid gap-2">
            <h2
              id="masuk-title"
              className="text-2xl leading-tight font-bold tracking-tight"
            >
              Masuk ke area staf
            </h2>
            <p className="text-sm text-muted-foreground">
              Pasien tidak perlu masuk untuk booking.
            </p>
          </div>

          {status === "error" ? (
            <div
              ref={alertRef}
              tabIndex={-1}
              role="alert"
              className="flex gap-3 rounded-md border border-destructive bg-destructive-soft p-4 outline-none"
            >
              <CircleAlert
                className="size-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div className="grid gap-1">
                <p className="font-semibold text-destructive">{failure}</p>
                <p className="text-sm">
                  Periksa lagi, atau hubungi admin klinik untuk bantuan akun.
                </p>
              </div>
            </div>
          ) : null}

          {status === "success" && roles ? (
            <p
              role="status"
              className="flex items-center gap-2 rounded-md bg-success-soft p-4 font-semibold text-success"
            >
              <Check className="size-4" aria-hidden="true" />
              {roles.length
                ? `Berhasil masuk sebagai ${roleLabel(roles).toLowerCase()}. Membuka menu Anda…`
                : "Berhasil masuk. Akun ini belum punya peran staf."}
            </p>
          ) : keluar && status === "idle" ? (
            <p
              role="status"
              className="flex items-center gap-2 rounded-md bg-primary-50 p-4 text-sm font-medium"
            >
              <Check className="size-4 text-primary" aria-hidden="true" />
              Anda sudah keluar dari area staf.
            </p>
          ) : null}

          <form noValidate onSubmit={submit} className="grid gap-5">
            <div className="grid gap-2">
              <label htmlFor="masuk-email" className="text-sm font-semibold">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  ref={emailRef}
                  id="masuk-email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="nama@klinik.test"
                  value={email}
                  disabled={busy}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    edited();
                  }}
                  aria-invalid={Boolean(showEmailError)}
                  aria-describedby={
                    showEmailError ? "masuk-email-error" : undefined
                  }
                  className={input}
                />
              </div>
              {showEmailError ? (
                <FieldError id="masuk-email-error">{showEmailError}</FieldError>
              ) : null}
            </div>

            <div className="grid gap-2">
              <label htmlFor="masuk-sandi" className="text-sm font-semibold">
                Kata sandi
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  ref={passwordRef}
                  id="masuk-sandi"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  disabled={busy}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    edited();
                  }}
                  aria-invalid={Boolean(showPasswordError)}
                  aria-describedby={
                    showPasswordError ? "masuk-sandi-error" : undefined
                  }
                  className={cn(input, "pr-32")}
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  aria-controls="masuk-sandi"
                  disabled={busy}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-1 right-1 inline-flex items-center gap-1 rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                  {showPassword ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
              {showPasswordError ? (
                <FieldError id="masuk-sandi-error">
                  {showPasswordError}
                </FieldError>
              ) : null}
            </div>

            <button
              type="submit"
              aria-busy={busy}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {status === "loading" ? (
                <LoaderCircle
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <LogIn className="size-4" aria-hidden="true" />
              )}
              {status === "loading" ? "Memeriksa…" : "Masuk"}
            </button>
          </form>

          <p className="flex gap-2 rounded-md bg-primary-50 p-3 text-sm text-muted-foreground">
            <Info
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>
              Lupa kata sandi? Hubungi admin klinik. Staf baru?{" "}
              <Link
                to="/sign-up"
                className="rounded-sm font-semibold text-primary underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-primary"
              >
                Buat akun staf
              </Link>
              , lalu minta admin memberi akses.
            </span>
          </p>
        </section>

        <Link
          to="/"
          className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Ke halaman booking pasien
        </Link>
      </main>
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p
      id={id}
      className="flex items-center gap-2 text-sm font-medium text-destructive"
    >
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}
