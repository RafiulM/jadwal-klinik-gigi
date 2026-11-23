import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CircleCheck,
  IdCard,
  LoaderCircle,
  LogIn,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import {
  ApiFailure,
  bookingApi,
  type AvailabilityDay,
  type BookingResult,
  type Service,
} from "./api";
import {
  DAY_SHORT,
  dayNumber,
  displayTime,
  formatLongDate,
  monthRangeLabel,
  toDoctorView,
  type DoctorView,
} from "./format";
import { ErrorNote, LoadingNote, type Load } from "./load-state";
import { messageOf } from "@/lib/api-client";
import { useLoad } from "@/lib/use-load";
import { nameError, phoneError } from "./patient-validation";
import { BookingSuccess } from "./booking-success";
import { StepConfirm } from "./step-confirm";
import { StepDoctor } from "./step-doctor";
import { StepHeading } from "./step-heading";
import { StepPatient } from "./step-patient";
import { StepSchedule, type DayOption } from "./step-schedule";
import { StepService } from "./step-service";
import { SummaryList } from "./summary-list";

export const STEPS = [
  { id: "layanan", label: "Layanan" },
  { id: "dokter", label: "Dokter" },
  { id: "jadwal", label: "Jadwal" },
  { id: "data", label: "Data diri" },
  { id: "konfirmasi", label: "Konfirmasi" },
] as const;

type BookingState = {
  serviceId: string | null;
  doctorId: string | null;
  date: string | null;
  time: string | null;
  name: string;
  phone: string;
};

const EMPTY: BookingState = {
  serviceId: null,
  doctorId: null,
  date: null,
  time: null,
  name: "",
  phone: "",
};

const cardShadow =
  "shadow-[0_1px_2px_rgb(27_36_33/0.06),0_12px_32px_rgb(27_36_33/0.08)]";

function dayOption(day: AvailabilityDay): DayOption {
  const free = day.slots.filter((s) => s.status === "available").length;
  let label = `${free} kosong`;
  if (day.slots.length === 0) label = "Libur";
  else if (free === 0)
    label = day.slots.every((s) => s.status === "past") ? "Lewat" : "Penuh";
  return {
    date: day.date,
    short: DAY_SHORT[day.dayOfWeek],
    day: dayNumber(day.date),
    long: formatLongDate(day.date),
    open: free > 0,
    label,
  };
}

export function BookingPage() {
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState<BookingState>(EMPTY);
  const [touched, setTouched] = useState({ name: false, phone: false });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [conflictTime, setConflictTime] = useState<string | null>(null);

  const [services, reloadServices] = useLoad("all", () =>
    bookingApi.services(),
  );
  const [doctors, reloadDoctors] = useLoad(booking.serviceId, (serviceId) =>
    bookingApi.doctors(serviceId).then((list) => list.map(toDoctorView)),
  );
  const [availability, reloadAvailability] = useLoad(
    booking.doctorId,
    (doctorId) => bookingApi.availability(doctorId).then((a) => a.days),
  );

  const headingRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const isDone = result !== null;
  const viewKeyRef = useRef(`${step}|${isDone}`);

  const stepLoad =
    step === 0
      ? services.state
      : step === 1
        ? doctors.state
        : step === 2
          ? availability.state
          : "ready";
  const pendingFocusRef = useRef(false);

  // Pindahkan fokus ke judul langkah saat berganti langkah (bukan saat muat awal).
  // Bila isi langkah masih dimuat, fokus diulang ke judul baru setelah data siap.
  useEffect(() => {
    const key = `${step}|${isDone}`;
    if (viewKeyRef.current !== key) {
      viewKeyRef.current = key;
      pendingFocusRef.current = true;
    }
    if (!pendingFocusRef.current) return;
    headingRef.current?.focus();
    if (stepLoad !== "loading") pendingFocusRef.current = false;
  }, [step, isDone, stepLoad]);

  const serviceList: Service[] =
    services.state === "ready" ? services.data : [];
  const doctorList: DoctorView[] =
    doctors.state === "ready" ? doctors.data : [];
  const dayList: AvailabilityDay[] =
    availability.state === "ready" ? availability.data : [];

  const service = serviceList.find((s) => s.id === booking.serviceId);
  const doctor = doctorList.find((d) => d.id === booking.doctorId);
  const days = dayList.map(dayOption);
  const selectedDay = dayList.find((d) => d.date === booking.date);

  const nameProblem = nameError(booking.name);
  const phoneProblem = phoneError(booking.phone);
  const trimmedName = booking.name.trim();
  const trimmedPhone = booking.phone.trim();

  const summary = [
    {
      id: "layanan",
      step: 0,
      label: "Layanan",
      icon: <Stethoscope />,
      value: service?.name ?? "",
    },
    {
      id: "dokter",
      step: 1,
      label: "Dokter",
      icon: <UserRound />,
      value: doctor?.name ?? "",
    },
    {
      id: "jadwal",
      step: 2,
      label: "Jadwal",
      icon: <CalendarClock />,
      value:
        booking.date && booking.time
          ? `${formatLongDate(booking.date)}, pukul ${displayTime(booking.time)}`
          : "",
    },
    {
      id: "pasien",
      step: 3,
      label: "Atas nama",
      icon: <IdCard />,
      value: trimmedName
        ? `${trimmedName}${trimmedPhone ? ` · ${trimmedPhone}` : ""}`
        : "",
    },
  ];

  function chooseService(id: string) {
    // Daftar dokter dimuat ulang untuk layanan baru; pilihan dokter dilepas.
    setBooking((prev) =>
      prev.serviceId === id
        ? prev
        : { ...prev, serviceId: id, doctorId: null, date: null, time: null },
    );
  }

  function chooseDoctor(id: string) {
    setBooking((prev) =>
      prev.doctorId === id
        ? prev
        : { ...prev, doctorId: id, date: null, time: null },
    );
    setConflictTime(null);
  }

  function chooseDate(date: string) {
    setBooking((prev) =>
      prev.date === date ? prev : { ...prev, date, time: null },
    );
  }

  function chooseTime(time: string) {
    setBooking((prev) => ({ ...prev, time }));
    setConflictTime(null);
  }

  async function submit() {
    const { serviceId, doctorId, date, time } = booking;
    if (submitting || !serviceId || !doctorId || !date || !time) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      setResult(
        await bookingApi.create({
          serviceId,
          doctorId,
          date,
          time,
          name: trimmedName,
          phone: booking.phone,
        }),
      );
    } catch (error) {
      if (error instanceof ApiFailure && error.code === "SLOT_TAKEN") {
        // Keburu diambil pasien lain: muat ulang slot dan kembali ke langkah jadwal.
        setConflictTime(time);
        setBooking((prev) => ({ ...prev, time: null }));
        reloadAvailability();
        setStep(2);
      } else {
        setSubmitError(messageOf(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (step === 3) {
      setTouched({ name: true, phone: true });
      if (nameProblem) return nameRef.current?.focus();
      if (phoneProblem) return phoneRef.current?.focus();
    }
    if (step === 4) return void submit();
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function goBack() {
    if (submitting) return;
    setStep((s) => Math.max(0, s - 1));
  }

  function resetAll() {
    setBooking(EMPTY);
    setTouched({ name: false, phone: false });
    setConflictTime(null);
    setSubmitError(null);
    setResult(null);
    setStep(0);
  }

  const canNext =
    step === 0
      ? Boolean(service)
      : step === 1
        ? Boolean(doctor)
        : step === 2
          ? Boolean(booking.date && booking.time)
          : true;

  let hint = "";
  if (step === 0 && !service) hint = "Pilih satu layanan untuk lanjut.";
  if (step === 1 && !doctor) hint = "Pilih dokter untuk lanjut.";
  if (step === 2 && !booking.date) hint = "Pilih tanggal dan jam untuk lanjut.";
  if (step === 2 && booking.date && !booking.time)
    hint = "Pilih jam untuk lanjut.";

  return (
    <div className="min-h-svh bg-background">
      <BookingHero showIntro={!isDone} />

      <main
        id="main-content"
        className="relative z-10 -mt-16 px-3 pb-10 md:px-8 md:pb-16"
      >
        {result ? (
          <BookingSuccess
            code={result.code}
            rows={[
              { ...summary[0], value: result.serviceName },
              { ...summary[1], value: result.doctorName },
              {
                ...summary[2],
                value: `${formatLongDate(result.date)}, pukul ${displayTime(result.time)}`,
              },
              {
                ...summary[3],
                value: `${result.patientName} · ${trimmedPhone}`,
              },
            ]}
            phone={trimmedPhone}
            onReset={resetAll}
            headingRef={headingRef}
          />
        ) : (
          <div className="mx-auto grid max-w-[640px] gap-6 lg:max-w-[1040px] lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
            <section
              aria-label="Formulir booking"
              className={cn(
                "grid min-w-0 gap-6 rounded-xl border bg-card px-4 pt-5 md:p-8",
                cardShadow,
              )}
            >
              <Stepper
                current={step}
                onJump={(target) => {
                  if (!submitting && target < step) setStep(target);
                }}
              />

              {step === 0 ? (
                services.state === "ready" ? (
                  <StepService
                    services={services.data}
                    selectedId={booking.serviceId}
                    onSelect={chooseService}
                    headingRef={headingRef}
                  />
                ) : (
                  <Pending
                    headingRef={headingRef}
                    title="Pilih layanan"
                    load={services}
                    loadingText="Memuat layanan…"
                    onRetry={reloadServices}
                  />
                )
              ) : null}

              {step === 1 ? (
                doctors.state === "ready" ? (
                  <StepDoctor
                    doctors={doctors.data}
                    serviceName={service?.name ?? null}
                    selectedId={booking.doctorId}
                    onSelect={chooseDoctor}
                    headingRef={headingRef}
                  />
                ) : (
                  <Pending
                    headingRef={headingRef}
                    title="Pilih dokter"
                    load={doctors}
                    loadingText="Memuat dokter…"
                    onRetry={reloadDoctors}
                  />
                )
              ) : null}

              {step === 2 && doctor ? (
                availability.state === "ready" ? (
                  <StepSchedule
                    doctorName={doctor.name}
                    monthLabel={monthRangeLabel(dayList.map((d) => d.date))}
                    days={days}
                    selectedDate={booking.date}
                    onSelectDate={chooseDate}
                    slots={selectedDay?.slots ?? []}
                    selectedTime={booking.time}
                    onSelectTime={chooseTime}
                    conflictTime={conflictTime}
                    headingRef={headingRef}
                  />
                ) : (
                  <Pending
                    headingRef={headingRef}
                    title="Pilih tanggal & jam"
                    load={availability}
                    loadingText="Memuat jam yang masih kosong…"
                    onRetry={reloadAvailability}
                  />
                )
              ) : null}

              {step === 3 ? (
                <StepPatient
                  name={booking.name}
                  phone={booking.phone}
                  nameError={touched.name ? nameProblem : ""}
                  phoneError={touched.phone ? phoneProblem : ""}
                  onName={(name) => setBooking((prev) => ({ ...prev, name }))}
                  onPhone={(phone) =>
                    setBooking((prev) => ({ ...prev, phone }))
                  }
                  onBlurName={() => setTouched((t) => ({ ...t, name: true }))}
                  onBlurPhone={() => setTouched((t) => ({ ...t, phone: true }))}
                  nameRef={nameRef}
                  phoneRef={phoneRef}
                  headingRef={headingRef}
                />
              ) : null}

              {step === 4 ? (
                <StepConfirm
                  rows={summary}
                  onEdit={(target) => setStep(target)}
                  error={submitError}
                  headingRef={headingRef}
                />
              ) : null}

              <WizardActions
                step={step}
                canNext={canNext}
                hint={hint}
                submitting={submitting}
                onBack={goBack}
                onNext={goNext}
              />
            </section>

            <aside
              aria-label="Ringkasan janji"
              className="hidden lg:sticky lg:top-6 lg:block"
            >
              <div
                className={cn(
                  "grid gap-2 rounded-xl border bg-card p-5",
                  cardShadow,
                )}
              >
                <h2 className="text-base font-bold">Ringkasan janji</h2>
                <SummaryList rows={summary} />
                <p className="flex gap-2 rounded-md bg-primary-50 p-3 text-xs text-muted-foreground">
                  <ShieldCheck
                    className="mt-0.5 size-3.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>
                    Jam yang tampil hanya jam yang masih kosong, jadi tidak akan
                    bentrok.
                  </span>
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function Pending<T>({
  headingRef,
  title,
  load,
  loadingText,
  onRetry,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  title: string;
  load: Load<T>;
  loadingText: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid gap-4">
      <StepHeading headingRef={headingRef} title={title} />
      {load.state === "error" ? (
        <ErrorNote message={load.message} onRetry={onRetry} />
      ) : (
        <LoadingNote>{loadingText}</LoadingNote>
      )}
    </div>
  );
}

function BookingHero({ showIntro }: { showIntro: boolean }) {
  return (
    <header className="bg-brand-deep px-4 pt-4 pb-20 text-on-brand-deep md:px-8 md:pt-5 md:pb-26">
      <div className="mx-auto grid max-w-[640px] gap-8 lg:max-w-[1040px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-lg font-bold tracking-tight">
              {siteConfig.name}
            </p>
            <p className="text-sm text-on-brand-deep-muted">
              Booking janji temu
            </p>
          </div>
          <Link
            to="/sign-in"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-brand-deep-active px-3 text-sm font-semibold text-on-brand-deep hover:bg-brand-deep-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-brand-deep"
          >
            <LogIn className="size-4" aria-hidden="true" />
            Masuk staf
          </Link>
        </div>
        {showIntro ? (
          <div className="grid max-w-[640px] gap-4">
            <h1 className="text-2xl leading-tight font-bold tracking-tight md:text-[34px]">
              Buat janji temu dalam 2 menit
            </h1>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {[
                "Tanpa daftar akun",
                "Hanya jam yang masih kosong",
                "Pengingat jadwal ke WhatsApp",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CircleCheck
                    className="size-4 text-on-brand-deep-muted"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function Stepper({
  current,
  onJump,
}: {
  current: number;
  onJump: (step: number) => void;
}) {
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
            {state === "done" ? (
              <button
                type="button"
                onClick={() => onJump(i)}
                className="group relative z-10 grid justify-items-center gap-2 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary ring-2 ring-primary ring-inset transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                >
                  <CircleCheck className="size-4" />
                </span>
                <span className="text-center text-xs leading-tight font-medium text-muted-foreground underline-offset-2 group-hover:text-primary group-hover:underline">
                  <span className="sr-only">Selesai, ubah: </span>
                  {s.label}
                </span>
              </button>
            ) : (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative z-10 inline-flex size-8 items-center justify-center rounded-full text-sm font-bold",
                    state === "todo" &&
                      "bg-card text-muted-foreground ring-2 ring-border-strong ring-inset",
                    state === "current" &&
                      "bg-primary text-primary-foreground ring-4 ring-primary-soft",
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "text-center text-xs leading-tight",
                    state === "current"
                      ? "font-bold text-foreground"
                      : "font-medium text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function WizardActions({
  step,
  canNext,
  hint,
  submitting,
  onBack,
  onNext,
}: {
  step: number;
  canNext: boolean;
  hint: string;
  submitting: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const isLast = step === STEPS.length - 1;
  return (
    <div className="sticky bottom-0 z-10 -mx-4 grid gap-2 rounded-b-xl border-t bg-card px-4 py-3 shadow-[0_-8px_24px_rgb(27_36_33/0.08)] md:static md:mx-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:rounded-none md:px-0 md:pt-5 md:pb-0 md:shadow-none">
      <p
        aria-live="polite"
        className="text-sm text-muted-foreground empty:hidden"
      >
        {hint}
      </p>
      <div className="flex gap-3 md:col-start-2">
        {step > 0 ? (
          <WizardButton
            variant="secondary"
            onClick={onBack}
            disabled={submitting}
          >
            <ArrowLeft aria-hidden="true" />
            Kembali
          </WizardButton>
        ) : null}
        {isLast ? (
          <WizardButton
            variant="primary"
            onClick={onNext}
            aria-busy={submitting}
            aria-disabled={submitting || undefined}
            className={submitting ? "cursor-progress" : undefined}
          >
            {submitting ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <CalendarCheck aria-hidden="true" />
            )}
            {submitting ? "Menyimpan…" : "Konfirmasi janji"}
          </WizardButton>
        ) : (
          <WizardButton variant="primary" onClick={onNext} disabled={!canNext}>
            Lanjut
            <ArrowRight aria-hidden="true" />
          </WizardButton>
        )}
      </div>
    </div>
  );
}

function WizardButton({
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
