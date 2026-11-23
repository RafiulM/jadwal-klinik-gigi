import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarClock,
  CalendarPlus,
  ExternalLink,
  MessageCircle,
  NotebookPen,
  ReceiptText,
  Smartphone,
  Stethoscope,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { displayTime, formatLongDate } from "@/features/booking/format";
import type { ScheduleAppointment } from "./mock-data";

function Fact({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
      <span
        aria-hidden="true"
        className="inline-flex size-8 items-center justify-center rounded-md bg-primary-50 text-primary"
      >
        <Icon className="size-4" />
      </span>
      <div className="grid min-w-0 gap-1">
        <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </dt>
        <dd className="leading-snug break-words">{children}</dd>
      </div>
    </div>
  );
}

const BOOKED_AT = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "081234567890" → "6281234567890" untuk tautan WhatsApp. */
function waNumber(phone: string) {
  return phone.startsWith("0") ? `62${phone.slice(1)}` : phone;
}

/** Detail satu janji temu di papan jadwal. */
export function AppointmentDialog({
  appointment,
  onClose,
  children,
}: {
  appointment: ScheduleAppointment | null;
  onClose: () => void;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (appointment && !dialog.open) dialog.showModal();
    if (!appointment && dialog.open) dialog.close();
  }, [appointment]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="janji-title"
      className="m-auto w-[calc(100%-2rem)] max-w-[560px] rounded-xl border bg-card p-0 text-foreground backdrop:bg-brand-deep/55"
    >
      {appointment ? (
        <div className="grid">
          <div className="flex items-start justify-between gap-3 rounded-t-xl bg-brand-deep p-5 text-on-brand-deep">
            <div className="grid min-w-0 gap-2">
              <p className="text-xs font-semibold tracking-wide text-on-brand-deep-muted uppercase">
                Detail janji temu
              </p>
              <h2
                id="janji-title"
                className="text-xl leading-tight font-bold tracking-tight break-words"
              >
                {appointment.patient.name}
              </h2>
              <div>
                <StatusBadge status={appointment.status} />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-deep-hover hover:bg-brand-deep-active focus-visible:outline-2 focus-visible:outline-on-brand-deep"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <dl className="grid gap-4 p-5">
            <Fact label="Jadwal" icon={CalendarClock}>
              {formatLongDate(appointment.date)}, pukul{" "}
              {displayTime(appointment.time)}–{displayTime(appointment.endTime)}
            </Fact>
            <Fact label="Layanan" icon={Stethoscope}>
              {appointment.service.name}
            </Fact>
            <Fact label="Dokter" icon={UserRound}>
              {appointment.doctor.name}
            </Fact>
            <Fact label="Nomor HP pasien" icon={Smartphone}>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <a
                  href={`tel:${appointment.patient.phone}`}
                  className="rounded-sm tabular-nums underline-offset-2 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {appointment.patient.phone}
                </a>
                <a
                  href={`https://wa.me/${waNumber(appointment.patient.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-primary underline underline-offset-3 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <MessageCircle className="size-3.5" aria-hidden="true" />
                  Chat WhatsApp
                  <span className="sr-only">(tab baru)</span>
                </a>
              </span>
            </Fact>
            <Fact label="Catatan dokter" icon={NotebookPen}>
              {appointment.notes || (
                <span className="text-muted-foreground">
                  {appointment.status === "scheduled"
                    ? "Diisi dokter setelah pemeriksaan."
                    : "Tidak ada catatan."}
                </span>
              )}
            </Fact>
            {appointment.status === "completed" ? (
              <Fact label="Kontrol berikutnya" icon={CalendarPlus}>
                {appointment.followUpDate ? (
                  formatLongDate(appointment.followUpDate)
                ) : (
                  <span className="text-muted-foreground">
                    Tidak dijadwalkan
                  </span>
                )}
              </Fact>
            ) : null}
            <Fact label="Booking" icon={ReceiptText}>
              <span className="grid gap-1">
                <span>
                  Kode {appointment.code} · dibuat{" "}
                  {BOOKED_AT.format(new Date(appointment.createdAt))}
                </span>
                <Link
                  to="/janji/$code"
                  params={{ code: appointment.code }}
                  target="_blank"
                  className="inline-flex items-center gap-1 justify-self-start rounded-sm text-sm font-semibold text-primary underline underline-offset-3 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Lihat bukti booking
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">(tab baru)</span>
                </Link>
              </span>
            </Fact>
          </dl>
          {children}
          <div className="flex justify-end border-t px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-12 items-center rounded-md border border-border-strong bg-card px-5 font-semibold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
