import type { ReactNode, Ref } from "react";
import { Pencil, RotateCcw, Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

// Potongan UI bersama untuk halaman Kelola klinik.

export const card =
  "rounded-xl border bg-card shadow-[0_1px_2px_rgb(27_36_33/0.05),0_8px_24px_rgb(27_36_33/0.05)]";

export const control =
  "min-h-12 w-full rounded-md border border-border-strong bg-card px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary aria-invalid:border-destructive";

export function SearchField({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputRef,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(control, "pl-10")}
        />
      </div>
    </div>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={control}
      >
        {children}
      </select>
    </div>
  );
}

export function ResetButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-12 items-center gap-2 justify-self-start rounded-md border border-border-strong bg-card px-4 text-sm font-semibold whitespace-nowrap hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground disabled:hover:bg-card"
    >
      <RotateCcw className="size-4" aria-hidden="true" />
      Reset filter
    </button>
  );
}

export function EmptyFiltered({
  onReset,
  children,
}: {
  onReset: () => void;
  children: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border-strong bg-card px-4 py-10 text-center">
      <SearchX className="size-8 text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{children}</p>
      <button
        type="button"
        onClick={onReset}
        className="rounded-sm p-1 text-sm font-semibold text-primary underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-primary"
      >
        Reset filter
      </button>
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-primary-50 px-2 py-1 text-xs font-semibold whitespace-nowrap text-primary">
      {children}
    </span>
  );
}

/** Saklar aktif/nonaktif yang tetap berupa checkbox untuk pembaca layar. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-medium",
        disabled && "cursor-wait opacity-70",
      )}
    >
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-border-strong transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary motion-reduce:transition-none [&>span]:transition-transform peer-checked:[&>span]:translate-x-5"
      >
        <span className="absolute top-1 left-1 size-4 rounded-full bg-card motion-reduce:transition-none" />
      </span>
      <span>{children}</span>
    </label>
  );
}

export function EditButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-1 rounded-md border border-primary-soft bg-primary-50 px-3 text-sm font-semibold whitespace-nowrap text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Pencil className="size-4" aria-hidden="true" />
      Ubah
    </button>
  );
}

/** Sel tabel yang menjadi baris berlabel di layar sempit. */
export function Cell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 md:table-cell md:border-b md:px-4 md:py-3 md:align-middle",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="text-xs font-semibold tracking-wide text-muted-foreground uppercase md:hidden"
      >
        {label}
      </span>
      <span className="justify-self-start">{children}</span>
    </td>
  );
}
