import { useId, useState } from "react";
import { NotebookPen } from "lucide-react";
import { ActionButton } from "./visit-actions";

export const NOTE_LIMIT = 280;

const textareaClass =
  "w-full resize-y rounded-md border border-border-strong bg-card p-3 text-base leading-normal outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary";

/** Kolom catatan untuk pasien yang sedang ditangani (disimpan saat ditandai selesai). */
export function NoteField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        Catatan singkat
      </label>
      <textarea
        id={id}
        rows={3}
        maxLength={NOTE_LIMIT}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Hasil pemeriksaan atau tindakan, bila perlu."
        aria-describedby={`${id}-count`}
        className={textareaClass}
      />
      <p
        id={`${id}-count`}
        className="justify-self-end text-xs text-muted-foreground"
      >
        {value.length}/{NOTE_LIMIT}
      </p>
    </div>
  );
}

/** Catatan kunjungan yang sudah selesai: tampil, dan bisa diubah. */
export function SavedNote({
  note,
  saving,
  onSave,
}: {
  note: string;
  saving: boolean;
  /** Kembalikan false bila gagal agar draf tetap terbuka. */
  onSave: (note: string) => Promise<boolean | void> | boolean | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);

  if (editing)
    return (
      <div className="grid gap-3">
        <NoteField value={draft} onChange={setDraft} />
        <div className="flex flex-wrap gap-3">
          <ActionButton
            variant="primary"
            disabled={saving}
            onClick={async () => {
              if ((await onSave(draft.trim())) !== false) setEditing(false);
            }}
          >
            {saving ? "Menyimpan…" : "Simpan catatan"}
          </ActionButton>
          <ActionButton
            variant="secondary"
            disabled={saving}
            onClick={() => {
              setDraft(note);
              setEditing(false);
            }}
          >
            Batal
          </ActionButton>
        </div>
      </div>
    );

  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
      <span
        aria-hidden="true"
        className="inline-flex size-8 items-center justify-center rounded-md bg-primary-50 text-primary"
      >
        <NotebookPen className="size-4" />
      </span>
      <div className="grid gap-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Catatan
        </p>
        <p className="break-words">
          {note || (
            <span className="text-muted-foreground">Tidak ada catatan.</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            setDraft(note);
            setEditing(true);
          }}
          className="justify-self-start rounded-sm p-1 text-sm font-semibold text-primary underline underline-offset-3 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
        >
          {note ? "Ubah catatan" : "Tambah catatan"}
        </button>
      </div>
    </div>
  );
}
