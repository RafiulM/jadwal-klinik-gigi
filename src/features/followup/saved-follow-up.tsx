import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { formatLongDate } from "@/features/booking/format";
import { ActionButton } from "@/features/doctor/visit-actions";
import { FollowUpDateField, followUpDateError } from "./follow-up-field";

/** Tanggal kontrol dari kunjungan yang sudah selesai: tampil, dan bisa diubah. */
export function SavedFollowUp({
  date,
  today,
  saving,
  onSave,
}: {
  date: string;
  today: string;
  saving: boolean;
  onSave: (date: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(date);
  const error = followUpDateError(draft, today);

  if (editing)
    return (
      <div className="grid gap-3">
        <FollowUpDateField
          value={draft}
          today={today}
          onChange={setDraft}
          showError
        />
        <div className="flex flex-wrap gap-3">
          <ActionButton
            variant="primary"
            disabled={saving || Boolean(error)}
            onClick={async () => {
              await onSave(draft);
              setEditing(false);
            }}
          >
            {saving ? "Menyimpan…" : "Simpan tanggal kontrol"}
          </ActionButton>
          <ActionButton
            variant="secondary"
            disabled={saving}
            onClick={() => {
              setDraft(date);
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
        <CalendarPlus className="size-4" />
      </span>
      <div className="grid gap-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Kontrol berikutnya
        </p>
        <p>
          {date ? (
            formatLongDate(date)
          ) : (
            <span className="text-muted-foreground">Tidak dijadwalkan</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            setDraft(date);
            setEditing(true);
          }}
          className="justify-self-start rounded-sm p-1 text-sm font-semibold text-primary underline underline-offset-3 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
        >
          {date ? "Ubah tanggal kontrol" : "Jadwalkan kontrol"}
        </button>
      </div>
    </div>
  );
}
