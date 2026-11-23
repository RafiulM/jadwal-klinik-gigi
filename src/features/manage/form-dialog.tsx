import { useEffect, useRef, type ReactNode } from "react";
import { CircleAlert, X } from "lucide-react";

/** Dialog modal untuk form tambah/ubah. Konten hanya dirender saat terbuka. */
export function FormDialog({
  open,
  busy,
  titleId,
  onClose,
  children,
}: {
  open: boolean;
  /** Saat menyimpan, Escape tidak menutup dialog. */
  busy?: boolean;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-[560px] rounded-xl border bg-card p-0 text-foreground backdrop:bg-brand-deep/55"
    >
      {open ? children : null}
    </dialog>
  );
}

export function DialogForm({
  titleId,
  title,
  submitLabel,
  saving,
  error,
  onCancel,
  onSubmit,
  children,
}: {
  titleId: string;
  title: string;
  submitLabel: string;
  saving: boolean;
  /** Galat dari server, mis. nama layanan sudah dipakai. */
  error?: string;
  onCancel: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="grid"
    >
      <div className="flex items-center justify-between gap-3 border-b p-5">
        <h2
          id={titleId}
          className="text-xl leading-tight font-bold tracking-tight"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          aria-label="Tutup"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="grid gap-5 p-5">
        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive"
          >
            <CircleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            {error}
          </p>
        ) : null}
        {children}
      </div>
      <div className="flex flex-wrap justify-end gap-3 border-t px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex min-h-12 items-center rounded-md border border-border-strong bg-card px-5 font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          className="inline-flex min-h-12 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
        >
          {saving ? "Menyimpan…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
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
  );
}

/** aria-describedby untuk input dengan petunjuk dan/atau galat. */
export function describedBy(id: string, hint: boolean, error: string) {
  const ids = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(
    Boolean,
  );
  return ids.length ? ids.join(" ") : undefined;
}
