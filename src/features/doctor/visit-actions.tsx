import type { ReactNode } from "react";
import { ArrowRight, Check, LoaderCircle, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodayAppointment } from "./mock-data";

export function ActionButton({
  variant,
  className,
  ...props
}: React.ComponentProps<"button"> & { variant: "primary" | "secondary" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-5 text-base font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-4",
        variant === "primary"
          ? "border-transparent bg-primary text-primary-foreground shadow-[0_4px_12px_rgb(15_107_92/0.3)] hover:bg-primary-hover"
          : "border-border-strong bg-card hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

/** Aksi untuk pasien yang masih menunggu: tandai selesai atau tidak datang. */
export function PendingVisitActions({
  busy,
  onDone,
  onNoShow,
  children,
}: {
  busy: "done" | "no_show" | null;
  onDone: () => void;
  onNoShow: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-5">
      {children}
      <div className="flex flex-wrap gap-3 border-t pt-5">
        <ActionButton
          variant="primary"
          onClick={onDone}
          disabled={busy !== null}
          className="flex-1 md:flex-none"
        >
          {busy === "done" ? (
            <LoaderCircle
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <Check aria-hidden="true" />
          )}
          Tandai selesai
        </ActionButton>
        <ActionButton
          variant="secondary"
          onClick={onNoShow}
          disabled={busy !== null}
          className="flex-1 md:flex-none"
        >
          {busy === "no_show" ? (
            <LoaderCircle
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <UserX aria-hidden="true" />
          )}
          Tidak datang
        </ActionButton>
      </div>
    </div>
  );
}

/** Hasil kunjungan yang sudah ditandai, dengan jalan balik bila salah tandai. */
export function MarkedVisit({
  appointment,
  nextPatient,
  onNext,
  onUndo,
  busy,
  children,
}: {
  appointment: TodayAppointment;
  nextPatient: TodayAppointment | undefined;
  onNext: () => void;
  onUndo: () => void;
  busy: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-5">
      {appointment.status === "no_show" ? (
        <p className="flex items-center gap-2 rounded-md bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive">
          <UserX className="size-4" aria-hidden="true" />
          Pasien tidak datang pada jam janji.
        </p>
      ) : null}
      {children}
      <div className="flex flex-wrap items-center gap-4">
        {nextPatient ? (
          <ActionButton variant="primary" onClick={onNext}>
            Pasien berikutnya
            <ArrowRight aria-hidden="true" />
          </ActionButton>
        ) : null}
        <button
          type="button"
          onClick={onUndo}
          disabled={busy}
          className="rounded-sm p-1 text-sm font-semibold text-primary underline underline-offset-3 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
        >
          Batalkan tanda
        </button>
      </div>
    </div>
  );
}
