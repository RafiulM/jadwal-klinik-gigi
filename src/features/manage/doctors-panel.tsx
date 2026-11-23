import { useRef, useState } from "react";
import { CircleAlert, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { doctorInitials } from "@/features/schedule/schedule-format";
import type { AdminDoctor, AdminService } from "./mock-data";
import {
  Cell,
  EmptyFiltered,
  Pill,
  ResetButton,
  SearchField,
  SelectField,
  card,
} from "./ui";

export function DoctorsPanel({
  doctors,
  services,
  actions,
  renderToggle,
  renderEdit,
}: {
  doctors: AdminDoctor[];
  services: AdminService[];
  actions?: React.ReactNode;
  renderToggle?: (doctor: AdminDoctor) => React.ReactNode;
  renderEdit?: (doctor: AdminDoctor) => React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [serviceId, setServiceId] = useState("semua");
  const [status, setStatus] = useState("semua");
  const searchRef = useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();
  const visible = doctors.filter(
    (d) =>
      (status === "semua" || (status === "aktif") === d.isActive) &&
      (serviceId === "semua" || d.serviceIds.includes(serviceId)) &&
      (!q ||
        d.name.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q)),
  );
  const filtered = q !== "" || serviceId !== "semua" || status !== "semua";
  const serviceName = (id: string) =>
    services.find((s) => s.id === id)?.name ?? "Layanan dihapus";

  function reset() {
    setQuery("");
    setServiceId("semua");
    setStatus("semua");
    searchRef.current?.focus();
  }

  return (
    <div className="grid gap-4">
      <div
        className={cn(
          card,
          "grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_auto] xl:items-end",
        )}
      >
        <SearchField
          id="cari-dokter"
          label="Cari dokter"
          placeholder="Nama atau bidang"
          value={query}
          onChange={setQuery}
          inputRef={searchRef}
        />
        <SelectField
          id="layanan-dokter"
          label="Layanan"
          value={serviceId}
          onChange={setServiceId}
        >
          <option value="semua">Semua layanan</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="status-dokter"
          label="Status"
          value={status}
          onChange={setStatus}
        >
          <option value="semua">Semua status</option>
          <option value="aktif">Menerima booking</option>
          <option value="nonaktif">Tidak menerima</option>
        </SelectField>
        <ResetButton disabled={!filtered} onClick={reset} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          Menampilkan {visible.length} dari {doctors.length} dokter ·{" "}
          {doctors.filter((d) => d.isActive).length} menerima booking
        </p>
        {actions}
      </div>

      {visible.length ? (
        <div className={cn(card, "overflow-x-auto")}>
          <table className="block w-full border-collapse text-sm md:table">
            <thead className="hidden bg-muted text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase md:table-header-group">
              <tr>
                {["Dokter", "Nomor HP", "Layanan", "Terima booking"].map(
                  (h) => (
                    <th key={h} scope="col" className="border-b px-4 py-3">
                      {h}
                    </th>
                  ),
                )}
                <th scope="col" className="border-b px-4 py-3">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {visible.map((d) => (
                <tr
                  key={d.id}
                  className={cn(
                    "grid gap-2 border-t p-4 first:border-t-0 md:table-row md:p-0 md:hover:bg-primary-50",
                    !d.isActive && "bg-muted/50",
                  )}
                >
                  <Cell label="Dokter">
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-sm font-bold text-on-brand-deep"
                      >
                        {doctorInitials(d.name)}
                      </span>
                      <span className="grid min-w-0">
                        <span className="font-semibold break-words">
                          {d.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {d.specialization || "Bidang belum diisi"}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-xs",
                            d.accountEmail
                              ? "text-muted-foreground"
                              : "font-medium text-warning",
                          )}
                        >
                          {d.accountEmail ? (
                            <KeyRound className="size-3" aria-hidden="true" />
                          ) : (
                            <CircleAlert
                              className="size-3"
                              aria-hidden="true"
                            />
                          )}
                          {d.accountEmail
                            ? `Akun: ${d.accountEmail}`
                            : "Belum ada akun login"}
                        </span>
                      </span>
                    </span>
                  </Cell>
                  <Cell label="Nomor HP" className="tabular-nums">
                    {d.phone || "–"}
                  </Cell>
                  <Cell label="Layanan">
                    <span className="flex flex-wrap gap-1">
                      {d.serviceIds.length ? (
                        d.serviceIds.map((id) => (
                          <Pill key={id}>{serviceName(id)}</Pill>
                        ))
                      ) : (
                        <span className="text-muted-foreground">
                          Belum ada layanan
                        </span>
                      )}
                    </span>
                  </Cell>
                  <Cell label="Booking">
                    {renderToggle ? (
                      renderToggle(d)
                    ) : (
                      <span>{d.isActive ? "Menerima" : "Tidak menerima"}</span>
                    )}
                  </Cell>
                  <td className="md:border-b md:px-4 md:py-3 md:text-right">
                    {renderEdit?.(d)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyFiltered onReset={reset}>
          Tidak ada dokter yang cocok dengan filter ini.
        </EmptyFiltered>
      )}
    </div>
  );
}
