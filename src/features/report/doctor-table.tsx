import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/features/booking/format";
import { doctorInitials } from "@/features/schedule/schedule-format";
import {
  EmptyFiltered,
  ResetButton,
  SearchField,
  SelectField,
} from "@/features/manage/ui";
import type { DayRecap } from "./api";
import { card, percent } from "./format";

/** Rincian per dokter untuk hari terpilih, dengan saringan dan total. */
export function DoctorTable({
  day,
  absent,
}: {
  day: DayRecap;
  absent: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState("semua");
  const searchRef = useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();
  const rows = day.doctors.filter(
    (r) =>
      (!q || r.name.toLowerCase().includes(q)) &&
      (show === "semua" ||
        (show === "tidak-datang" && r.noShow > 0) ||
        (show === "menunggu" && r.waiting > 0)),
  );
  const filtered = q !== "" || show !== "semua";
  const totals = {
    total: rows.reduce((s, r) => s + r.total, 0),
    completed: rows.reduce((s, r) => s + r.completed, 0),
    noShow: rows.reduce((s, r) => s + r.noShow, 0),
    waiting: rows.reduce((s, r) => s + r.waiting, 0),
  };

  function reset() {
    setQuery("");
    setShow("semua");
    searchRef.current?.focus();
  }

  return (
    <section
      aria-labelledby="rincian-title"
      className={cn(card, "grid content-start gap-4 p-5")}
    >
      <div className="grid gap-1">
        <h2 id="rincian-title" className="font-bold">
          Rincian per dokter
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatLongDate(day.date)}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_auto] md:items-end">
        <SearchField
          id="rekap-cari-dokter"
          label="Cari dokter"
          placeholder="Nama dokter"
          value={query}
          onChange={setQuery}
          inputRef={searchRef}
        />
        <SelectField
          id="rekap-tampil-dokter"
          label="Tampilkan"
          value={show}
          onChange={setShow}
        >
          <option value="semua">Semua dokter</option>
          <option value="tidak-datang">Ada pasien tidak datang</option>
          <option value="menunggu">Masih ada yang menunggu</option>
        </SelectField>
        <ResetButton disabled={!filtered} onClick={reset} />
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        Menampilkan {rows.length} dari {day.doctors.length} dokter
      </p>
      {rows.length ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="bg-muted text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <tr>
                {[
                  "Dokter",
                  "Janji",
                  "Selesai",
                  "Tidak datang",
                  "Belum ditangani",
                  "Penyelesaian",
                ].map((h) => (
                  <th key={h} scope="col" className="border-b px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-primary-50">
                  <th
                    scope="row"
                    className="border-b px-4 py-3 text-left font-semibold"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-deep text-xs font-bold text-on-brand-deep"
                      >
                        {doctorInitials(r.name)}
                      </span>
                      {r.name}
                    </span>
                  </th>
                  <td className="border-b px-4 py-3 tabular-nums">{r.total}</td>
                  <td className="border-b px-4 py-3 tabular-nums">
                    {r.completed}
                  </td>
                  <td className="border-b px-4 py-3 tabular-nums">
                    {r.noShow}
                  </td>
                  <td className="border-b px-4 py-3 tabular-nums">
                    {r.waiting}
                  </td>
                  <td className="border-b px-4 py-3">
                    <span className="inline-flex items-center gap-2 tabular-nums">
                      <span
                        aria-hidden="true"
                        className="block h-2 w-16 overflow-hidden rounded-full bg-primary-soft"
                      >
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{
                            width: `${r.total ? (r.completed / r.total) * 100 : 0}%`,
                          }}
                        />
                      </span>
                      {percent(r.completed, r.total)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/60 font-semibold">
              <tr>
                <th scope="row" className="px-4 py-3 text-left">
                  {filtered ? "Total ditampilkan" : "Total"}
                </th>
                <td className="px-4 py-3 tabular-nums">{totals.total}</td>
                <td className="px-4 py-3 tabular-nums">{totals.completed}</td>
                <td className="px-4 py-3 tabular-nums">{totals.noShow}</td>
                <td className="px-4 py-3 tabular-nums">{totals.waiting}</td>
                <td className="px-4 py-3 tabular-nums">
                  {percent(totals.completed, totals.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <EmptyFiltered onReset={reset}>
          Tidak ada dokter yang cocok dengan filter ini.
        </EmptyFiltered>
      )}
      {absent.length ? (
        <p className="text-xs text-muted-foreground">
          Tidak praktik: {absent.map((d) => d.name).join("; ")}
        </p>
      ) : null}
    </section>
  );
}
