import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CircleCheck,
  IdCard,
  LogIn,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { DATES, DOCTORS, SERVICES } from "./mock-data";
import { StepHeading } from "./step-heading";
import { StepService } from "./step-service";

export const STEPS = [
  { id: "layanan", label: "Layanan" },
  { id: "dokter", label: "Dokter" },
  { id: "jadwal", label: "Jadwal" },
  { id: "data", label: "Data diri" },
  { id: "konfirmasi", label: "Konfirmasi" },
] as const;

export type BookingState = {
  serviceId: string | null;
  doctorId: string | null;
  dateId: string | null;
  time: string | null;
  name: string;
  phone: string;
};

const EMPTY: BookingState = {
  serviceId: null,
  doctorId: null,
  dateId: null,
  time: null,
  name: "",
  phone: "",
};

export function BookingPage() {
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState<BookingState>(EMPTY);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastStepRef = useRef(step);

  // Pindahkan fokus ke judul langkah saat berganti langkah (bukan saat muat awal).
  useEffect(() => {
    if (lastStepRef.current === step) return;
    lastStepRef.current = step;
    headingRef.current?.focus();
  }, [step]);

  const service = SERVICES.find((s) => s.id === booking.serviceId);
  const doctor = DOCTORS.find((d) => d.id === booking.doctorId);
  const date = DATES.find((d) => d.id === booking.dateId);

  const summary: SummaryRow[] = [
    { id: "layanan", label: "Layanan", icon: <Stethoscope />, value: service?.name ?? "" },
    { id: "dokter", label: "Dokter", icon: <UserRound />, value: doctor?.name ?? "" },
    {
      id: "jadwal",
      label: "Jadwal",
      icon: <CalendarClock />,
      value: date && booking.time ? `${date.long}, pukul ${booking.time}` : "",
    },
    {
      id: "pasien",
      label: "Atas nama",
      icon: <IdCard />,
      value: booking.name.trim()
        ? `${booking.name.trim()}${booking.phone.trim() ? ` · ${booking.phone.trim()}` : ""}`
        : "",
    },
  ];

  function chooseService(id: string) {
    setBooking((prev) => {
      const current = DOCTORS.find((d) => d.id === prev.doctorId);
      // Dokter yang tidak melayani layanan baru dilepas, beserta jadwalnya.
      if (current && !current.serviceIds.includes(id))
        return { ...prev, serviceId: id, doctorId: null, dateId: null, time: null };
      return { ...prev, serviceId: id };
    });
  }

  const canNext =
    step === 0
      ? Boolean(booking.serviceId)
      : step === 1
        ? Boolean(booking.doctorId)
        : step === 2
          ? Boolean(booking.dateId && booking.time)
          : true;

  return (
    <div className="min-h-svh bg-background">
      <BookingHero />

      <main
        id="main-content"
        className="relative z-10 -mt-16 px-3 pb-10 md:px-8 md:pb-16"
      >
        <div className="mx-auto grid max-w-[640px] gap-6 lg:max-w-[1040px] lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
          <section
            aria-label="Formulir booking"
            className="grid min-w-0 gap-6 rounded-xl border bg-card px-4 pt-5 shadow-[0_1px_2px_rgb(27_36_33/0.06),0_12px_32px_rgb(27_36_33/0.08)] md:p-8"
          >
            <Stepper current={step} />

            {step === 0 ? (
              <StepService
                services={SERVICES}
                selectedId={booking.serviceId}
                onSelect={chooseService}
                headingRef={headingRef}
              />
            ) : (
              <StepPlaceholder headingRef={headingRef} step={step} />
            )}

            <WizardActions
              step={step}
              canNext={canNext}
              onBack={() => setStep((s) => Math.max(0, s - 1))}
              onNext={() =>
                setStep((s) => Math.min(STEPS.length - 1, s + 1))
              }
            />
          </section>

          <aside aria-label="Ringkasan janji" className="hidden lg:sticky lg:top-6 lg:block">
            <div className="grid gap-2 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(27_36_33/0.06),0_12px_32px_rgb(27_36_33/0.08)]">
              <h2 className="text-base font-bold">Ringkasan janji</h2>
              <SummaryList rows={summary} />
              <p className="flex gap-2 rounded-md bg-primary-50 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span>Jam yang tampil hanya jam yang masih kosong, jadi tidak akan bentrok.</span>
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function BookingHero() {
  return (
    <header className="bg-brand-deep px-4 pt-4 pb-20 text-on-brand-deep md:px-8 md:pt-5 md:pb-26">
      <div className="mx-auto grid max-w-[640px] gap-8 lg:max-w-[1040px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-lg font-bold tracking-tight">{siteConfig.name}</p>
            <p className="text-sm text-on-brand-deep-muted">Booking janji temu</p>
          </div>
          <Link
            to="/sign-in"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-brand-deep-active px-3 text-sm font-semibold text-on-brand-deep hover:bg-brand-deep-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-brand-deep"
          >
            <LogIn className="size-4" aria-hidden="true" />
            Masuk staf
          </Link>
        </div>
        <div className="grid max-w-[640px] gap-4">
          <h1 className="text-2xl leading-tight font-bold tracking-tight md:text-[34px]">
            Buat janji temu dalam 2 menit
          </h1>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {["Tanpa daftar akun", "Hanya jam yang masih kosong", "Pengingat jadwal ke WhatsApp"].map(
              (item) => (
                <li key={item} className="flex items-center gap-2">
                  <CircleCheck className="size-4 text-on-brand-deep-muted" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
    </header>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol aria-label="Langkah booking" className="grid grid-cols-5">
      {STEPS.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li
            key={s.id}
            aria-current={i === current ? "step" : undefined}
            className="relative grid min-w-0 justify-items-center gap-2"
          >
            {i > 0 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-[15px] right-1/2 h-0.5 w-full",
                  state === "todo" ? "bg-border" : "bg-primary",
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 inline-flex size-8 items-center justify-center rounded-full text-sm font-bold",
                state === "todo" && "bg-card text-muted-foreground ring-2 ring-border-strong ring-inset",
                state === "done" && "bg-primary-soft text-primary ring-2 ring-primary ring-inset",
                state === "current" && "bg-primary text-primary-foreground ring-4 ring-primary-soft",
              )}
            >
              {state === "done" ? <CircleCheck className="size-4" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-center text-xs leading-tight",
                state === "current" ? "font-bold text-foreground" : "font-medium text-muted-foreground",
              )}
            >
              {state === "done" ? <span className="sr-only">Selesai: </span> : null}
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StepPlaceholder({
  headingRef,
  step,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  step: number;
}) {
  return (
    <StepHeading
      headingRef={headingRef}
      title={STEPS[step].label}
      lead="Bagian ini sedang disiapkan."
    />
  );
}

function WizardActions({
  step,
  canNext,
  onBack,
  onNext,
}: {
  step: number;
  canNext: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const hints = [
    "Pilih satu layanan untuk lanjut.",
    "Pilih dokter untuk lanjut.",
    "Pilih tanggal dan jam untuk lanjut.",
  ];
  const hint = !canNext ? hints[step] : "";
  return (
    <div className="sticky bottom-0 z-10 -mx-4 grid gap-2 rounded-b-xl border-t bg-card px-4 py-3 shadow-[0_-8px_24px_rgb(27_36_33/0.08)] md:static md:mx-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:rounded-none md:px-0 md:pt-5 md:pb-0 md:shadow-none">
      <p aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
        {hint}
      </p>
      <div className="flex gap-3 md:col-start-2">
        {step > 0 ? (
          <WizardButton variant="secondary" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            Kembali
          </WizardButton>
        ) : null}
        <WizardButton variant="primary" onClick={onNext} disabled={!canNext}>
          Lanjut
          <ArrowRight aria-hidden="true" />
        </WizardButton>
      </div>
    </div>
  );
}

export function WizardButton({
  variant,
  className,
  ...props
}: React.ComponentProps<"button"> & { variant: "primary" | "secondary" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-5 text-base font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none [&_svg]:size-4",
        variant === "primary"
          ? "flex-1 border-transparent bg-primary text-primary-foreground shadow-[0_4px_12px_rgb(15_107_92/0.3)] hover:bg-primary-hover md:min-w-48 md:flex-none"
          : "border-border-strong bg-card text-foreground hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

type SummaryRow = { id: string; label: string; icon: ReactNode; value: string };

export function SummaryList({
  rows,
  onEdit,
}: {
  rows: (SummaryRow & { step?: number })[];
  onEdit?: (step: number) => void;
}) {
  return (
    <dl className="grid">
      {rows.map((row, i) => (
        <div
          key={row.id}
          className={cn(
            "grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3 py-3",
            i > 0 && "border-t",
          )}
        >
          <span
            aria-hidden="true"
            className="inline-flex size-10 items-center justify-center rounded-md bg-primary-50 text-primary [&_svg]:size-[18px]"
          >
            {row.icon}
          </span>
          <div className="grid min-w-0 gap-1">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="flex items-baseline justify-between gap-3">
              <span
                className={cn(
                  "min-w-0 text-base leading-snug [overflow-wrap:anywhere]",
                  row.value ? "font-semibold" : "text-muted-foreground",
                )}
              >
                {row.value || "Belum dipilih"}
              </span>
              {onEdit && row.step !== undefined ? (
                <button
                  type="button"
                  onClick={() => onEdit(row.step!)}
                  aria-label={`Ubah ${row.label.toLowerCase()}`}
                  className="shrink-0 rounded-sm p-1 text-sm font-semibold text-primary underline underline-offset-3 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Ubah
                </button>
              ) : null}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
