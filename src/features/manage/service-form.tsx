import { useState } from "react";
import { cn } from "@/lib/utils";
import { DialogForm, Field, describedBy } from "./form-dialog";
import type { AdminService } from "./mock-data";
import { control } from "./ui";

export type ServiceInput = Omit<AdminService, "id" | "isActive">;

/** Validasi yang sama dengan server: nama wajib, durasi 5–240, kontrol 1–730. */
export function serviceErrors(input: {
  name: string;
  duration: string;
  followUp: string;
}) {
  const duration = Number(input.duration);
  const followUp = Number(input.followUp);
  return {
    name: !input.name.trim()
      ? "Isi nama layanan."
      : input.name.trim().length > 80
        ? "Nama layanan maksimal 80 karakter."
        : "",
    duration:
      Number.isInteger(duration) && duration >= 5 && duration <= 240
        ? ""
        : "Isi durasi 5–240 menit.",
    followUp:
      input.followUp === "" ||
      (Number.isInteger(followUp) && followUp >= 1 && followUp <= 730)
        ? ""
        : "Isi 1–730 hari, atau kosongkan.",
  };
}

export function ServiceForm({
  initial,
  saving,
  error,
  onCancel,
  onSave,
}: {
  initial: AdminService | null;
  saving: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (input: ServiceInput) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [duration, setDuration] = useState(
    String(initial?.durationMinutes ?? 30),
  );
  const [followUp, setFollowUp] = useState(
    initial?.followUpDays ? String(initial.followUpDays) : "",
  );
  const [tried, setTried] = useState(false);
  const errors = serviceErrors({ name, duration, followUp });
  const show = (key: keyof typeof errors) => (tried ? errors[key] : "");

  function submit() {
    setTried(true);
    if (errors.name || errors.duration || errors.followUp) {
      document
        .getElementById(
          errors.name ? "l-nama" : errors.duration ? "l-durasi" : "l-kontrol",
        )
        ?.focus();
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim(),
      durationMinutes: Number(duration),
      followUpDays: followUp === "" ? null : Number(followUp),
    });
  }

  return (
    <DialogForm
      titleId="layanan-title"
      title={initial ? "Ubah layanan" : "Tambah layanan"}
      submitLabel="Simpan layanan"
      saving={saving}
      error={error}
      onCancel={onCancel}
      onSubmit={submit}
    >
      <Field id="l-nama" label="Nama layanan" error={show("name")}>
        <input
          id="l-nama"
          type="text"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(show("name"))}
          aria-describedby={describedBy("l-nama", false, show("name"))}
          className={control}
        />
      </Field>
      <Field
        id="l-ket"
        label="Keterangan"
        hint="Tampil di halaman booking, di bawah nama layanan."
      >
        <textarea
          id="l-ket"
          rows={2}
          maxLength={280}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-describedby="l-ket-hint"
          className={cn(control, "resize-y py-3")}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="l-durasi"
          label="Perkiraan durasi (menit)"
          error={show("duration")}
        >
          <input
            id="l-durasi"
            type="number"
            inputMode="numeric"
            min={5}
            max={240}
            step={5}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            aria-invalid={Boolean(show("duration"))}
            aria-describedby={describedBy("l-durasi", false, show("duration"))}
            className={control}
          />
        </Field>
        <Field
          id="l-kontrol"
          label="Saran kontrol (hari)"
          hint="Kosongkan jika tidak perlu kontrol rutin."
          error={show("followUp")}
        >
          <input
            id="l-kontrol"
            type="number"
            inputMode="numeric"
            min={1}
            max={730}
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            aria-invalid={Boolean(show("followUp"))}
            aria-describedby={describedBy("l-kontrol", true, show("followUp"))}
            className={control}
          />
        </Field>
      </div>
    </DialogForm>
  );
}
