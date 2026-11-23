import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AdminService } from "./mock-data";
import {
  Cell,
  EmptyFiltered,
  Pill,
  ResetButton,
  SearchField,
  SelectField,
  card,
} from "./ui";

export function ServicesPanel({
  services,
  actions,
  renderToggle,
  renderEdit,
}: {
  services: AdminService[];
  /** Tombol di kanan ringkasan, mis. "Tambah layanan". */
  actions?: React.ReactNode;
  renderToggle?: (service: AdminService) => React.ReactNode;
  renderEdit?: (service: AdminService) => React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("semua");
  const searchRef = useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();
  const visible = services.filter(
    (s) =>
      (status === "semua" || (status === "aktif") === s.isActive) &&
      (!q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)),
  );
  const filtered = q !== "" || status !== "semua";

  function reset() {
    setQuery("");
    setStatus("semua");
    searchRef.current?.focus();
  }

  return (
    <div className="grid gap-4">
      <div
        className={cn(
          card,
          "grid gap-3 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_auto] md:items-end",
        )}
      >
        <SearchField
          id="cari-layanan"
          label="Cari layanan"
          placeholder="Nama atau keterangan"
          value={query}
          onChange={setQuery}
          inputRef={searchRef}
        />
        <SelectField
          id="status-layanan"
          label="Status"
          value={status}
          onChange={setStatus}
        >
          <option value="semua">Semua status</option>
          <option value="aktif">Tampil di booking</option>
          <option value="nonaktif">Disembunyikan</option>
        </SelectField>
        <ResetButton disabled={!filtered} onClick={reset} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          Menampilkan {visible.length} dari {services.length} layanan ·{" "}
          {services.filter((s) => s.isActive).length} tampil di booking
        </p>
        {actions}
      </div>

      {visible.length ? (
        <div className={cn(card, "overflow-hidden")}>
          <table className="block w-full border-collapse text-sm md:table">
            <thead className="hidden bg-muted text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase md:table-header-group">
              <tr>
                {[
                  "Layanan",
                  "Durasi",
                  "Saran kontrol",
                  "Tampil di booking",
                ].map((h) => (
                  <th key={h} scope="col" className="border-b px-4 py-3">
                    {h}
                  </th>
                ))}
                <th scope="col" className="border-b px-4 py-3">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {visible.map((s) => (
                <tr
                  key={s.id}
                  className={cn(
                    "grid gap-2 border-t p-4 first:border-t-0 md:table-row md:p-0 md:hover:bg-primary-50",
                    !s.isActive && "bg-muted/50",
                  )}
                >
                  <Cell label="Layanan">
                    <span className="grid min-w-0 gap-1">
                      <span className="font-semibold break-words">
                        {s.name}
                      </span>
                      {s.description ? (
                        <span className="text-xs text-muted-foreground">
                          {s.description}
                        </span>
                      ) : null}
                    </span>
                  </Cell>
                  <Cell label="Durasi" className="tabular-nums">
                    ± {s.durationMinutes} menit
                  </Cell>
                  <Cell label="Saran kontrol">
                    {s.followUpDays ? (
                      <Pill>Tiap {s.followUpDays} hari</Pill>
                    ) : (
                      <span className="text-muted-foreground">Tidak ada</span>
                    )}
                  </Cell>
                  <Cell label="Booking">
                    {renderToggle ? (
                      renderToggle(s)
                    ) : (
                      <span>{s.isActive ? "Tampil" : "Disembunyikan"}</span>
                    )}
                  </Cell>
                  <td className="md:border-b md:px-4 md:py-3 md:text-right">
                    {renderEdit?.(s)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyFiltered onReset={reset}>
          Tidak ada layanan yang cocok dengan filter ini.
        </EmptyFiltered>
      )}
    </div>
  );
}
