import { useState, type FormEvent } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Daftar akun staf. Akun baru belum punya peran; admin klinik menautkannya
 * ke data dokter atau memberi peran admin/pemilik.
 */
export function SignUpForm() {
  const router = useRouter();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const result = await authClient.signUp.email({
        email: String(data.get("email")).trim(),
        password: String(data.get("password")),
        name: String(data.get("name")).trim(),
      });
      if (result.error) {
        setError(
          result.error.status === 429
            ? "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi."
            : result.error.code === "USER_ALREADY_EXISTS"
              ? "Email ini sudah terdaftar. Silakan masuk."
              : "Akun belum bisa dibuat. Periksa data lalu coba lagi.",
        );
        return;
      }
      // Muat ulang penjaga rute dengan cookie baru; /masuk mengarahkan sesuai peran.
      await router.invalidate();
      await navigate({ to: "/masuk", replace: true });
    } catch {
      setError(
        "Tidak bisa terhubung ke klinik. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <p className="mb-3 text-sm font-medium text-primary">Akun staf klinik</p>
      <h1 className="text-3xl font-semibold tracking-tight">Buat akun staf</h1>
      <p className="mt-3 text-base leading-7 text-muted-foreground">
        Untuk dokter dan staf klinik. Setelah mendaftar, minta admin klinik
        menautkan akun ini agar menu Anda muncul. Pasien tidak perlu akun.
      </p>
      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-5"
        aria-busy={pending}
        aria-describedby={error ? "auth-error" : undefined}
      >
        <fieldset disabled={pending} className="space-y-5">
          <legend className="sr-only">Data akun</legend>
          <div className="space-y-2">
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="drg. Nama Lengkap"
              required
              minLength={1}
              maxLength={100}
              pattern=".*\S.*"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@klinik.test"
              required
              maxLength={254}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata sandi</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              aria-describedby="password-hint"
            />
            <p id="password-hint" className="text-sm text-muted-foreground">
              Minimal 8 karakter.
            </p>
          </div>
          {error && (
            <p
              id="auth-error"
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm leading-6 text-destructive"
            >
              {error}
            </p>
          )}
          <Button className="w-full" type="submit" size="lg" disabled={pending}>
            {pending ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : null}
            {pending ? "Mohon tunggu…" : "Buat akun"}
            {!pending && <ArrowRight aria-hidden="true" />}
          </Button>
        </fieldset>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link
          className="rounded-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          to="/masuk"
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}
