// Klien browser untuk API booking publik (src/routes/api/booking).

export type Service = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  followUpDays: number | null;
};

export type DoctorSchedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
};

export type ApiDoctor = {
  id: string;
  name: string;
  field: string;
  schedules: DoctorSchedule[];
};

export type SlotStatus = "available" | "taken" | "past";

export type AvailabilityDay = {
  date: string;
  dayOfWeek: number;
  slots: { time: string; status: SlotStatus }[];
};

export type BookingResult = {
  code: string;
  date: string;
  time: string;
  endTime: string;
  serviceName: string;
  doctorName: string;
  patientName: string;
  patientPhone: string;
};

export type BookingDetail = Omit<BookingResult, "patientPhone"> & {
  status: "scheduled" | "completed" | "no_show";
  patientPhone: string;
};

export class ApiFailure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiFailure(
      0,
      "NETWORK_ERROR",
      "Tidak bisa terhubung ke klinik. Periksa koneksi internet Anda.",
    );
  }
  const body = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { code: string; message: string };
  } | null;
  if (!response.ok || !body || body.data === undefined)
    throw new ApiFailure(
      response.status,
      body?.error?.code ?? "UNKNOWN",
      body?.error?.message ?? "Terjadi kesalahan. Coba lagi.",
    );
  return body.data;
}

export const bookingApi = {
  services: () => request<Service[]>("/api/booking/services"),
  doctors: (serviceId: string) =>
    request<ApiDoctor[]>(
      `/api/booking/doctors?serviceId=${encodeURIComponent(serviceId)}`,
    ),
  availability: (doctorId: string) =>
    request<{ doctorId: string; from: string; days: AvailabilityDay[] }>(
      `/api/booking/availability?doctorId=${encodeURIComponent(doctorId)}&days=7`,
    ),
  create: (input: {
    serviceId: string;
    doctorId: string;
    date: string;
    time: string;
    name: string;
    phone: string;
  }) =>
    request<BookingResult>("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  detail: (code: string) =>
    request<BookingDetail>(`/api/booking/${encodeURIComponent(code)}`),
};
