import { useRef, useState, type KeyboardEvent } from "react";
import {
  Clock,
  Eye,
  Plus,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { messageOf } from "@/lib/api-client";
import { useLoad } from "@/lib/use-load";
import { ErrorNote, LoadingNote } from "@/features/booking/load-state";
import { manageApi } from "./api";
import { FormDialog } from "./form-dialog";
import { ServiceForm, type ServiceInput } from "./service-form";
import { DoctorForm, type DoctorInput } from "./doctor-form";
import { cn } from "@/lib/utils";
import { DoctorsPanel } from "./doctors-panel";
import type { AdminDoctor, AdminService } from "./mock-data";
import { HoursEditor } from "./hours-editor";
import { BookingPreview } from "./booking-preview";
import { ServicesPanel } from "./services-panel";
import { EditButton, Switch } from "./ui";

type TabId = "layanan" | "dokter" | "jam" | "pratinjau";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "layanan", label: "Layanan", icon: Stethoscope },
  { id: "dokter", label: "Dokter", icon: UserRound },
  { id: "jam", label: "Jam praktik", icon: Clock },
  { id: "pratinjau", label: "Pratinjau booking", icon: Eye },
];

export function ManagePage() {
  const [load, reload] = useLoad("kelola", () =>
    Promise.all([manageApi.services(), manageApi.doctors()]),
  );
  if (load.state === "ready")
    return (
      <ManageView
        initialServices={load.data[0]}
        initialDoctors={load.data[1]}
      />
    );
  return (
    <div className="grid gap-4 px-4 pt-5 pb-10 md:p-8 lg:px-10">
      <h1 className="text-2xl font-bold tracking-tight">Kelola klinik</h1>
      {load.state === "error" ? (
        <ErrorNote message={load.message} onRetry={reload} />
      ) : (
        <LoadingNote>Memuat data klinik…</LoadingNote>
      )}
    </div>
  );
}

type Editing =
  | { type: "layanan"; item: AdminService | null }
  | { type: "dokter"; item: AdminDoctor | null }
  | null;

function ManageView({
  initialServices,
  initialDoctors,
}: {
  initialServices: AdminService[];
  initialDoctors: AdminDoctor[];
}) {
  const [services, setServices] = useState<AdminService[]>(initialServices);
  const [doctors, setDoctors] = useState<AdminDoctor[]>(initialDoctors);
  const [editing, setEditing] = useState<Editing>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [tab, setTab] = useState<TabId>("layanan");
  const [scheduleDoctor, setScheduleDoctor] = useState(
    initialDoctors[0]?.id ?? "",
  );
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const counts: Record<TabId, number | null> = {
    layanan: services.length,
    dokter: doctors.length,
    jam: null,
    pratinjau: null,
  };

  // Tab mengikuti pola ARIA: panah kiri/kanan, Home, End.
  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((t) => t.id === tab);
    const next =
      event.key === "ArrowRight"
        ? TABS[(index + 1) % TABS.length]
        : event.key === "ArrowLeft"
          ? TABS[(index + TABS.length - 1) % TABS.length]
          : event.key === "Home"
            ? TABS[0]
            : event.key === "End"
              ? TABS[TABS.length - 1]
              : null;
    if (!next) return;
    event.preventDefault();
    setTab(next.id);
    tabRefs.current[next.id]?.focus();
  }

  function announce(text: string) {
    setError("");
    setMessage(text);
  }

  function openEditor(next: NonNullable<Editing>) {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setFormError("");
    setEditing(next);
  }

  function closeEditor() {
    setEditing(null);
    returnFocusRef.current?.focus();
  }

  async function saveService(input: ServiceInput) {
    const current = editing?.type === "layanan" ? editing.item : null;
    setSaving(true);
    setFormError("");
    try {
      const saved = current
        ? await manageApi.updateService(current.id, input)
        : await manageApi.createService(input);
      setServices((prev) =>
        current
          ? prev.map((s) => (s.id === saved.id ? saved : s))
          : [...prev, saved],
      );
      announce(
        current
          ? `Layanan ${saved.name} diperbarui.`
          : `Layanan ${saved.name} ditambahkan dan tampil di booking.`,
      );
      closeEditor();
    } catch (failure) {
      setFormError(messageOf(failure));
    } finally {
      setSaving(false);
    }
  }

  async function saveDoctor(input: DoctorInput) {
    const current = editing?.type === "dokter" ? editing.item : null;
    setSaving(true);
    setFormError("");
    try {
      const saved = current
        ? await manageApi.updateDoctor(current.id, input)
        : await manageApi.createDoctor(input);
      setDoctors((prev) =>
        current
          ? prev.map((d) => (d.id === saved.id ? saved : d))
          : [...prev, saved],
      );
      announce(
        current
          ? `Data ${saved.name} diperbarui.`
          : `${saved.name} ditambahkan. Atur jam praktiknya agar muncul di booking.`,
      );
      closeEditor();
    } catch (failure) {
      setFormError(messageOf(failure));
    } finally {
      setSaving(false);
    }
  }

  async function toggleDoctor(doctor: AdminDoctor, isActive: boolean) {
    setToggling(doctor.id);
    try {
      const saved = await manageApi.updateDoctor(doctor.id, { isActive });
      setDoctors((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
      announce(
        `${saved.name} ${isActive ? "kembali menerima booking." : "tidak menerima booking baru."}`,
      );
    } catch (failure) {
      setMessage("");
      setError(messageOf(failure));
    } finally {
      setToggling(null);
    }
  }

  async function toggleService(service: AdminService, isActive: boolean) {
    setToggling(service.id);
    try {
      const saved = await manageApi.updateService(service.id, { isActive });
      setServices((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      announce(
        `${saved.name} ${isActive ? "kembali tampil di booking." : "disembunyikan dari booking."}`,
      );
    } catch (failure) {
      setMessage("");
      setError(messageOf(failure));
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="px-4 pt-5 pb-10 md:p-8 lg:px-10">
      <header className="mb-6 grid gap-1">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
          Admin klinik
        </p>
        <h1 className="text-2xl leading-tight font-bold tracking-tight">
          Kelola klinik
        </h1>
        <p className="text-sm text-muted-foreground">
          Atur layanan, dokter, dan jam praktik yang muncul di halaman booking
          pasien.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Bagian kelola"
        onKeyDown={onTabKeyDown}
        className="mb-5 inline-flex flex-wrap gap-1 rounded-md bg-muted p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(node) => {
              tabRefs.current[t.id] = node;
            }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => {
              setTab(t.id);
              setMessage("");
            }}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-sm px-4 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
              tab === t.id
                ? "bg-card font-semibold text-primary shadow-[0_1px_3px_rgb(27_36_33/0.12)]"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="size-4" aria-hidden="true" />
            {t.label}
            {counts[t.id] !== null ? (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1 text-center text-xs font-bold",
                  tab === t.id
                    ? "bg-primary-50 text-primary"
                    : "bg-card text-muted-foreground",
                )}
              >
                {counts[t.id]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <p
        role="status"
        className="mb-5 rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success empty:hidden"
      >
        {message}
      </p>
      {error ? (
        <p
          role="alert"
          className="mb-5 rounded-md bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      ) : null}

      <section
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === "layanan" ? (
          <ServicesPanel
            services={services}
            actions={
              <button
                type="button"
                onClick={() => openEditor({ type: "layanan", item: null })}
                className="inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Plus className="size-4" aria-hidden="true" />
                Tambah layanan
              </button>
            }
            renderToggle={(s) => (
              <Switch
                label={`Tampil di booking: ${s.name}`}
                checked={s.isActive}
                disabled={toggling === s.id}
                onChange={(on) => toggleService(s, on)}
              >
                {s.isActive ? "Tampil" : "Disembunyikan"}
              </Switch>
            )}
            renderEdit={(s) => (
              <EditButton
                label={`Ubah ${s.name}`}
                onClick={() => openEditor({ type: "layanan", item: s })}
              />
            )}
          />
        ) : null}
        {tab === "dokter" ? (
          <DoctorsPanel
            doctors={doctors}
            services={services}
            actions={
              <button
                type="button"
                onClick={() => openEditor({ type: "dokter", item: null })}
                className="inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Plus className="size-4" aria-hidden="true" />
                Tambah dokter
              </button>
            }
            renderToggle={(d) => (
              <Switch
                label={`Terima booking: ${d.name}`}
                checked={d.isActive}
                disabled={toggling === d.id}
                onChange={(on) => toggleDoctor(d, on)}
              >
                {d.isActive ? "Menerima" : "Tidak menerima"}
              </Switch>
            )}
            renderEdit={(d) => (
              <EditButton
                label={`Ubah ${d.name}`}
                onClick={() => openEditor({ type: "dokter", item: d })}
              />
            )}
          />
        ) : null}
        {tab === "jam" ? (
          <HoursEditor
            doctors={doctors}
            doctorId={scheduleDoctor}
            onDoctorChange={(id) => {
              setScheduleDoctor(id);
              setMessage("");
            }}
            onSaved={(text) => {
              announce(text);
              setScheduleVersion((v) => v + 1);
            }}
          />
        ) : null}
        {tab === "pratinjau" ? (
          <BookingPreview
            services={services}
            doctors={doctors}
            version={scheduleVersion}
          />
        ) : null}
      </section>

      <FormDialog
        open={editing !== null}
        titleId={editing?.type === "dokter" ? "dokter-title" : "layanan-title"}
        onClose={closeEditor}
      >
        {editing?.type === "layanan" ? (
          <ServiceForm
            initial={editing.item}
            saving={saving}
            error={formError}
            onCancel={closeEditor}
            onSave={saveService}
          />
        ) : null}
        {editing?.type === "dokter" ? (
          <DoctorForm
            initial={editing.item}
            services={services}
            saving={saving}
            error={formError}
            onCancel={closeEditor}
            onSave={saveDoctor}
          />
        ) : null}
      </FormDialog>
    </div>
  );
}
