import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { DialogForm, Field, describedBy } from "./form-dialog";
import type { AdminDoctor, AdminService } from "./mock-data";
import { control } from "./ui";

export type DoctorInput = Omit<AdminDoctor, "id" | "isActive">;

const PHONE = /^(\+62|62|0)8\d{7,11}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validasi yang sama dengan server. */
export function doctorErrors(input: {
  name: string;
  phone: string;
  accountEmail: string;
  serviceIds: string[];
}) {
  const phone = input.phone.replace(/[\s-]/g, "");
  return {
    name: !input.name.trim()
      ? "Isi nama dokter."
      : input.name.trim().length > 120
        ? "Nama dokter maksimal 120 karakter."
        : "",
    phone:
      phone === "" || PHONE.test(phone)
        ? ""
        : "Gunakan nomor HP Indonesia, contoh 0812 3456 7890.",
    accountEmail:
      input.accountEmail.trim() === "" || EMAIL.test(input.accountEmail.trim())
        ? ""
        : "Gunakan alamat email yang valid.",
    services: input.serviceIds.length ? "" : "Pilih minimal satu layanan.",
  };
}

export function DoctorForm({
  initial,
  services,
  saving,
  error,
  onCancel,
  onSave,
}: {
  initial: AdminDoctor | null;
  services: AdminService[];
  saving: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (input: DoctorInput) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [specialization, setSpecialization] = useState(
    initial?.specialization ?? "",
  );
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [accountEmail, setAccountEmail] = useState(initial?.accountEmail ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>(
    initial?.serviceIds ?? [],
  );
  const [tried, setTried] = useState(false);
  const errors = doctorErrors({ name, phone, accountEmail, serviceIds });
  const show = (key: keyof typeof errors) => (tried ? errors[key] : "");

  function toggle(id: string, on: boolean) {
    setServiceIds((prev) =>
      on ? [...prev, id] : prev.filter((value) => value !== id),
    );
  }

  function submit() {
    setTried(true);
    const first = errors.name
      ? "d-nama"
      : errors.phone
        ? "d-hp"
        : errors.accountEmail
          ? "d-email"
          : errors.services
            ? `d-layanan-${services[0]?.id}`
            : "";
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    onSave({
      name: name.trim(),
      specialization: specialization.trim(),
      phone: phone.replace(/[\s-]/g, ""),
      accountEmail: accountEmail.trim().toLowerCase() || null,
      serviceIds,
    });
  }

  return (
    <DialogForm
      titleId="dokter-title"
      title={initial ? "Ubah dokter" : "Tambah dokter"}
      submitLabel="Simpan dokter"
      saving={saving}
      error={error}
      onCancel={onCancel}
      onSubmit={submit}
    >
      <Field id="d-nama" label="Nama dokter" error={show("name")}>
        <input
          id="d-nama"
          type="text"
          value={name}
          maxLength={120}
          placeholder="drg. Nama Lengkap"
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(show("name"))}
          aria-describedby={describedBy("d-nama", false, show("name"))}
          className={control}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="d-bidang" label="Bidang">
          <input
            id="d-bidang"
            type="text"
            value={specialization}
            maxLength={120}
            placeholder="Dokter gigi umum"
            onChange={(e) => setSpecialization(e.target.value)}
            className={control}
          />
        </Field>
        <Field id="d-hp" label="Nomor HP" error={show("phone")}>
          <input
            id="d-hp"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={Boolean(show("phone"))}
            aria-describedby={describedBy("d-hp", false, show("phone"))}
            className={control}
          />
        </Field>
      </div>
      <Field
        id="d-email"
        label="Email akun login dokter (opsional)"
        hint="Dokter masuk dengan akun ini untuk melihat Jadwal hari ini. Akun dibuat lewat halaman Daftar."
        error={show("accountEmail")}
      >
        <input
          id="d-email"
          type="email"
          autoComplete="off"
          value={accountEmail}
          onChange={(e) => setAccountEmail(e.target.value)}
          aria-invalid={Boolean(show("accountEmail"))}
          aria-describedby={describedBy("d-email", true, show("accountEmail"))}
          className={control}
        />
      </Field>
      <fieldset
        className="grid min-w-0 gap-2"
        aria-describedby={show("services") ? "d-layanan-error" : undefined}
      >
        <legend className="mb-2 text-sm font-semibold">
          Layanan yang ditangani
        </legend>
        {services.map((s) => (
          <label
            key={s.id}
            className="flex min-h-10 cursor-pointer items-center gap-3"
          >
            <input
              id={`d-layanan-${s.id}`}
              type="checkbox"
              checked={serviceIds.includes(s.id)}
              onChange={(e) => toggle(s.id, e.target.checked)}
              className="size-5 accent-primary"
            />
            <span>
              {s.name}
              {s.isActive ? null : (
                <span className="text-sm text-muted-foreground">
                  {" "}
                  (disembunyikan dari booking)
                </span>
              )}
            </span>
          </label>
        ))}
        {show("services") ? (
          <p
            id="d-layanan-error"
            className="flex items-center gap-2 text-sm font-medium text-destructive"
          >
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            {show("services")}
          </p>
        ) : null}
      </fieldset>
    </DialogForm>
  );
}
