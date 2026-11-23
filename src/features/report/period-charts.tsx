import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DAY_SHORT,
  dayNumber,
  formatLongDate,
} from "@/features/booking/format";
import { doctorInitials } from "@/features/schedule/schedule-format";
import {
  EmptyFiltered,
  ResetButton,
  SearchField,
  SelectField,
} from "@/features/manage/ui";
import type { DailyReport, PeriodDoctor } from "./types";
import { card, percent } from "./format";

/** Batas atas sumbu yang "rapi" (kelipatan langkah) dan garis bantunya. */
function niceScale(max: number) {
  const step = max <= 20 ? 5 : max <= 40 ? 10 : Math.ceil(max / 4 / 5) * 5;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return { top, ticks };
}

/**
 * Kolom pasien selesai per hari dalam jendela 8 hari. Satu seri, jadi judul
 * menamai datanya (tanpa legenda); hari terpilih diberi warna utama, hari
 * tutup ditandai teks. Klik kolom untuk membuka harinya.
 */
export function TrendColumns({
  report,
  selected,
  onSelect,
}: {
  report: DailyReport;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const { top, ticks } = niceScale(
    Math.max(...report.days.map((d) => d.completed)),
  );
  const [hover, setHover] = useState<string | null>(null);
  return (
    <section
      aria-labelledby="tren-title"
      className={cn(card, "grid content-start gap-4 p-5")}
    >
      <div className="grid gap-1">
        <h2 id="tren-title" className="font-bold">
          Pasien selesai, {report.days.length} hari terakhir
        </h2>
        <p className="text-sm text-muted-foreground">
          Hari yang dipilih ditandai warna. Klik kolom untuk membuka harinya.
        </p>
      </div>
      <div>
        <div className="relative h-48">
          {ticks.map((t) => (
            <div
              key={t}
              aria-hidden="true"
              className="absolute inset-x-0 flex translate-y-1/2 items-center gap-2"
              style={{ bottom: `${(t / top) * 100}%` }}
            >
              <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">
                {t}
              </span>
              <span
                className={cn(
                  "h-px flex-1",
                  t === 0 ? "bg-border-strong" : "bg-border",
                )}
              />
            </div>
          ))}
          <div
            className="absolute inset-y-0 right-0 left-8 grid"
            style={{
              gridTemplateColumns: `repeat(${report.days.length}, minmax(0, 1fr))`,
            }}
          >
            {report.days.map((d, i) => {
              const closed = d.total === 0;
              const pressed = d.date === selected;
              const height = `${(d.completed / top) * 100}%`;
              const label = closed
                ? `${formatLongDate(d.date)}: tidak ada janji`
                : `${formatLongDate(d.date)}: ${d.completed} pasien selesai dari ${d.total} janji${d.date === report.today ? ", hari ini masih berjalan" : ""}`;
              return (
                <button
                  key={d.date}
                  type="button"
                  aria-pressed={pressed}
                  aria-label={label}
                  onClick={() => onSelect(d.date)}
                  onMouseEnter={() => setHover(d.date)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(d.date)}
                  onBlur={() => setHover(null)}
                  className="group relative h-full rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {closed ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-1 text-center text-[10px] text-muted-foreground"
                    >
                      –
                    </span>
                  ) : null}
                  {pressed && !closed ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 text-center text-sm font-semibold tabular-nums"
                      style={{ bottom: `calc(${height} + 4px)` }}
                    >
                      {d.completed}
                    </span>
                  ) : null}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute bottom-0 left-1/2 w-6 max-w-[70%] -translate-x-1/2 rounded-t-xs transition-colors motion-reduce:transition-none",
                      pressed
                        ? "bg-primary"
                        : "bg-[#958d7f] group-hover:bg-primary/70",
                    )}
                    style={{ height }}
                  />
                  {hover === d.date ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute z-10 grid gap-0.5 rounded-md border bg-card px-3 py-2 text-left text-xs whitespace-nowrap shadow-[0_8px_24px_rgb(27_36_33/0.12)]",
                        i < report.days.length / 2 ? "left-0" : "right-0",
                      )}
                      style={{ bottom: `calc(${height} + 8px)` }}
                    >
                      <strong className="text-sm">
                        {closed ? "Tidak ada janji" : `${d.completed} selesai`}
                      </strong>
                      <span className="text-muted-foreground">
                        {DAY_SHORT[d.dayOfWeek]} {dayNumber(d.date)}
                        {closed ? "" : ` · dari ${d.total} janji`}
                        {d.date === report.today ? " · berjalan" : ""}
                      </span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="mt-2 ml-8 grid text-xs leading-tight text-muted-foreground"
          style={{
            gridTemplateColumns: `repeat(${report.days.length}, minmax(0, 1fr))`,
          }}
        >
          {report.days.map((d) => (
            <span key={d.date} className="grid justify-items-center">
              <span>{DAY_SHORT[d.dayOfWeek]}</span>
              <span>{dayNumber(d.date)}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Jumlah pasien per dokter selama jendela 8 hari: batang horizontal pasien
 * selesai (skala bersama) plus daftar angka lengkap yang bisa disaring.
 */
export function DoctorPeriod({ report }: { report: DailyReport }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("selesai");
  const searchRef = useRef<HTMLInputElement>(null);

  // Agregasi dari server, ditambah dokter aktif yang tidak punya janji.
  const all: PeriodDoctor[] = [
    ...report.period,
    ...report.doctors
      .filter((d) => !report.period.some((p) => p.id === d.id))
      .map((d) => ({
        ...d,
        days: 0,
        patients: 0,
        total: 0,
        completed: 0,
        noShow: 0,
      })),
  ];
  const max = Math.max(1, ...all.map((r) => r.completed));
  const q = query.trim().toLowerCase();
  const rows = all
    .filter((r) => !q || r.name.toLowerCase().includes(q))
    .sort((a, b) =>
      sort === "nama"
        ? a.name.localeCompare(b.name)
        : sort === "tidak-datang"
          ? b.noShow - a.noShow
          : b.completed - a.completed || b.total - a.total,
    );
  const first = report.days[0]?.date;
  const last = report.days[report.days.length - 1]?.date;

  function reset() {
    setQuery("");
    setSort("selesai");
    searchRef.current?.focus();
  }

  return (
    <section
      aria-labelledby="periode-title"
      className={cn(card, "grid content-start gap-4 p-5")}
    >
      <div className="grid gap-1">
        <h2 id="periode-title" className="font-bold">
          Jumlah pasien per dokter, {report.days.length} hari terakhir
        </h2>
        <p className="text-sm text-muted-foreground">
          {first && last
            ? `${formatLongDate(first)} – ${formatLongDate(last)}`
            : ""}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_auto] md:items-end">
        <SearchField
          id="periode-cari"
          label="Cari dokter"
          placeholder="Nama dokter"
          value={query}
          onChange={setQuery}
          inputRef={searchRef}
        />
        <SelectField
          id="periode-urut"
          label="Urutkan"
          value={sort}
          onChange={setSort}
        >
          <option value="selesai">Pasien selesai terbanyak</option>
          <option value="tidak-datang">Tidak datang terbanyak</option>
          <option value="nama">Nama dokter</option>
        </SelectField>
        <ResetButton
          disabled={q === "" && sort === "selesai"}
          onClick={reset}
        />
      </div>
      {rows.length ? (
        <ol className="grid gap-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3"
            >
              <span
                aria-hidden="true"
                className="inline-flex size-8 items-center justify-center rounded-full bg-brand-deep text-xs font-bold text-on-brand-deep"
              >
                {doctorInitials(r.name)}
              </span>
              <div className="grid gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold break-words">{r.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {r.days} hari praktik · {r.patients} pasien · {r.total}{" "}
                    janji · {r.noShow} tidak datang ·{" "}
                    {percent(r.completed, r.total)} selesai
                  </span>
                </div>
                <div
                  role="img"
                  aria-label={`${r.name}: ${r.completed} pasien selesai dari ${r.total} janji dalam ${r.days} hari praktik`}
                  className="relative flex h-5 items-center gap-2"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-px bg-border-strong"
                  />
                  <span
                    aria-hidden="true"
                    className="block h-3 rounded-r-xs bg-primary"
                    style={{
                      width: `calc((100% - 2.5rem) * ${r.completed / max})`,
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className="text-sm font-semibold tabular-nums"
                  >
                    {r.completed}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyFiltered onReset={reset}>
          Tidak ada dokter yang cocok dengan pencarian ini.
        </EmptyFiltered>
      )}
    </section>
  );
}
