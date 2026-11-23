import { CircleAlert, Smartphone, UserRound } from "lucide-react";
import { StepHeading } from "./step-heading";

const inputClass =
  "min-h-12 w-full rounded-md border border-border-strong bg-card pr-4 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary aria-invalid:border-destructive aria-invalid:bg-destructive-soft";

function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="flex items-center gap-2 text-sm font-medium text-destructive">
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

export function StepPatient({
  name,
  phone,
  nameError,
  phoneError,
  onName,
  onPhone,
  onBlurName,
  onBlurPhone,
  nameRef,
  phoneRef,
  headingRef,
}: {
  name: string;
  phone: string;
  nameError: string;
  phoneError: string;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  onBlurName: () => void;
  onBlurPhone: () => void;
  nameRef: React.RefObject<HTMLInputElement | null>;
  phoneRef: React.RefObject<HTMLInputElement | null>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="grid gap-5">
      <StepHeading
        headingRef={headingRef}
        title="Isi data diri"
        lead="Cukup nama dan nomor HP. Tanpa akun, tanpa kata sandi."
      />

      <div className="grid gap-2">
        <label htmlFor="booking-nama" className="text-sm font-semibold">
          Nama lengkap
        </label>
        <div className="relative">
          <UserRound
            className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={nameRef}
            id="booking-nama"
            type="text"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(e) => onName(e.target.value)}
            onBlur={onBlurName}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? "booking-nama-error" : undefined}
            className={inputClass}
          />
        </div>
        {nameError ? <FieldError id="booking-nama-error">{nameError}</FieldError> : null}
      </div>

      <div className="grid gap-2">
        <label htmlFor="booking-hp" className="text-sm font-semibold">
          Nomor HP (WhatsApp)
        </label>
        <div className="relative">
          <Smartphone
            className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={phoneRef}
            id="booking-hp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0812 3456 7890"
            value={phone}
            onChange={(e) => onPhone(e.target.value)}
            onBlur={onBlurPhone}
            aria-invalid={phoneError ? true : undefined}
            aria-describedby={
              phoneError ? "booking-hp-help booking-hp-error" : "booking-hp-help"
            }
            className={inputClass}
          />
        </div>
        <p id="booking-hp-help" className="text-sm text-muted-foreground">
          Dipakai klinik untuk mengirim pengingat jadwal.
        </p>
        {phoneError ? <FieldError id="booking-hp-error">{phoneError}</FieldError> : null}
      </div>
    </div>
  );
}
