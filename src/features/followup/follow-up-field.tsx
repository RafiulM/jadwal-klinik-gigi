import { useId, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";

export function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Tanggal kontrol harus setelah hari ini dan paling lambat 2 tahun lagi. */
export function followUpDateError(value: string, today: string) {
  if (!value) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Tanggal tidak valid.";
  if (value <= today) return "Tanggal kontrol harus setelah hari ini.";
  if (value > addDays(today, 730))
    return "Tanggal kontrol paling lambat 2 tahun dari sekarang.";
  return "";
}

/** Pilih tanggal kontrol berikutnya. Kosong berarti pasien tidak perlu kontrol. */
export function FollowUpDateField({
  value,
  today,
  onChange,
  inputRef,
  showError,
  children,
}: {
  value: string;
  today: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  showError: boolean;
  children?: ReactNode;
}) {
  const id = useId();
  const error = showError ? followUpDateError(value, today) : "";
  return (
    <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
      <legend className="mb-3 p-0 text-sm font-semibold">
        Kontrol berikutnya
      </legend>
      {children}
      <div className="grid gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          Tanggal kontrol
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            id={id}
            type="date"
            min={addDays(today, 1)}
            max={addDays(today, 730)}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-help ${id}-error` : `${id}-help`}
            className="min-h-12 rounded-md border border-border-strong bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary aria-invalid:border-destructive aria-invalid:bg-destructive-soft"
          />
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-sm p-1 text-sm font-semibold text-primary underline underline-offset-3 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
            >
              Kosongkan
            </button>
          ) : null}
        </div>
        <p id={`${id}-help`} className="text-sm text-muted-foreground">
          Biarkan kosong jika pasien tidak perlu kontrol.
        </p>
        {error ? (
          <p
            id={`${id}-error`}
            className="flex items-center gap-2 text-sm font-medium text-destructive"
          >
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
