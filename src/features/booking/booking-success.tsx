import { Check, MessageCircle, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { SummaryList } from "./summary-list";

export function BookingSuccess({
  code,
  rows,
  phone,
  onReset,
  headingRef,
}: {
  code: string;
  rows: { id: string; label: string; icon: ReactNode; value: string }[];
  phone: string;
  onReset: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section className="mx-auto grid max-w-[640px] gap-6 rounded-xl border bg-card px-4 py-6 shadow-[0_1px_2px_rgb(27_36_33/0.06),0_12px_32px_rgb(27_36_33/0.08)] md:p-8">
      <div className="grid justify-items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className="inline-flex size-16 items-center justify-center rounded-full bg-success-soft text-success"
        >
          <Check className="size-8" />
        </span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl leading-tight font-bold tracking-tight outline-none"
        >
          Janji temu tercatat
        </h1>
        <p className="text-muted-foreground">
          Simpan kode booking ini untuk ditunjukkan saat datang ke klinik.
        </p>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="grid gap-1 rounded-t-xl bg-brand-deep p-5 text-on-brand-deep">
          <p className="text-xs font-semibold tracking-wide text-on-brand-deep-muted uppercase">
            Kode booking
          </p>
          <p className="text-[34px] leading-tight font-bold tracking-wide">{code}</p>
        </div>
        <div className="border-t-2 border-dashed border-border-strong px-5 py-2">
          <SummaryList rows={rows} />
        </div>
      </div>

      <p className="flex gap-3 rounded-md bg-primary-50 p-4 text-sm">
        <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          Pengingat jadwal akan dikirim ke nomor{" "}
          <strong className="font-semibold whitespace-nowrap">{phone}</strong>.
        </span>
      </p>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-12 items-center gap-2 rounded-md border border-border-strong bg-card px-5 font-semibold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          <Plus className="size-4" aria-hidden="true" />
          Buat janji lain
        </button>
      </div>
    </section>
  );
}
