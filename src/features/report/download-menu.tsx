import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { messageOf } from "@/lib/api-client";
import { DAY_SHORT, dayNumber } from "@/features/booking/format";
import { reportApi, type DailyReport, type DayRecap } from "./api";
import { saveFile } from "./download";

type Notice = { tone: "success" | "error"; text: string } | null;

/**
 * Tombol unduh rekap (CSV dari server) untuk hari terpilih dan untuk
 * seluruh jendela hari, dengan notifikasi setelah berkas tersimpan atau bila
 * gagal. Notifikasi sukses hilang sendiri setelah beberapa detik.
 */
export function DownloadButtons({
  report,
  day,
}: {
  report: DailyReport;
  day: DayRecap;
}) {
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<"hari" | "rentang" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function download(jenis: "hari" | "rentang") {
    if (busy) return;
    setBusy(jenis);
    setNotice(null);
    if (timer.current) clearTimeout(timer.current);
    try {
      const date = jenis === "hari" ? day.date : report.date;
      const file = await reportApi.export(date, jenis);
      saveFile(file.filename, file.blob);
      setNotice({
        tone: "success",
        text: `Rekap diunduh sebagai ${file.filename}.`,
      });
      timer.current = setTimeout(() => setNotice(null), 6000);
    } catch (failure) {
      setNotice({ tone: "error", text: messageOf(failure) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid justify-items-start gap-2 sm:justify-items-end">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => download("hari")}
          disabled={day.total === 0 || busy !== null}
          aria-busy={busy === "hari"}
          className="inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="size-4" aria-hidden="true" />
          {busy === "hari"
            ? "Menyiapkan…"
            : `Unduh rekap ${DAY_SHORT[day.dayOfWeek]} ${dayNumber(day.date)} (CSV)`}
        </button>
        <button
          type="button"
          onClick={() => download("rentang")}
          disabled={busy !== null}
          aria-busy={busy === "rentang"}
          className="inline-flex min-h-12 items-center gap-2 rounded-md border border-border-strong bg-card px-4 font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="size-4" aria-hidden="true" />
          {busy === "rentang"
            ? "Menyiapkan…"
            : `${report.days.length} hari (CSV)`}
        </button>
      </div>
      <div role="status" aria-live="polite">
        {notice ? (
          <p
            className={cn(
              "flex items-center gap-2 rounded-md py-1 pr-1 pl-3 text-sm font-medium",
              notice.tone === "success"
                ? "bg-success-soft text-success"
                : "bg-destructive-soft text-destructive",
            )}
          >
            {notice.tone === "success" ? (
              <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            )}
            {notice.text}
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Tutup pemberitahuan"
              className="inline-flex size-8 items-center justify-center rounded-sm hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}
