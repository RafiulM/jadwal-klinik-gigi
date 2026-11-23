import { useEffect, useRef, useState } from "react";
import { CircleCheck, Download, X } from "lucide-react";
import { DAY_SHORT, dayNumber } from "@/features/booking/format";
import type { DailyReport, DayRecap } from "./api";
import { dayCsv, periodCsv, saveFile } from "./download";

/**
 * Tombol unduh rekap (CSV) untuk hari terpilih dan untuk seluruh jendela
 * hari, dengan notifikasi singkat setelah berkas dibuat. Notifikasi hilang
 * sendiri setelah beberapa detik dan bisa ditutup.
 */
export function DownloadButtons({
  report,
  day,
}: {
  report: DailyReport;
  day: DayRecap;
}) {
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function notify(text: string) {
    setNotice(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 6000);
  }

  function downloadDay() {
    const name = `rekap-klinik-${day.date}.csv`;
    saveFile(name, dayCsv(day));
    notify(`Rekap ${day.date} diunduh sebagai ${name}.`);
  }

  function downloadPeriod() {
    const first = report.days[0].date;
    const name = `rekap-klinik-${first}_${report.date}.csv`;
    saveFile(name, periodCsv(report));
    notify(`Rekap ${report.days.length} hari diunduh sebagai ${name}.`);
  }

  return (
    <div className="grid justify-items-start gap-2 sm:justify-items-end">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadDay}
          disabled={day.total === 0}
          className="inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="size-4" aria-hidden="true" />
          Unduh rekap {DAY_SHORT[day.dayOfWeek]} {dayNumber(day.date)} (CSV)
        </button>
        <button
          type="button"
          onClick={downloadPeriod}
          className="inline-flex min-h-12 items-center gap-2 rounded-md border border-border-strong bg-card px-4 font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Download className="size-4" aria-hidden="true" />
          {report.days.length} hari (CSV)
        </button>
      </div>
      <div role="status" aria-live="polite">
        {notice ? (
          <p className="flex items-center gap-2 rounded-md bg-success-soft py-1 pr-1 pl-3 text-sm font-medium text-success">
            <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
            {notice}
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Tutup pemberitahuan"
              className="inline-flex size-8 items-center justify-center rounded-sm hover:bg-success/10 focus-visible:outline-2 focus-visible:outline-success"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}
