// Klien browser untuk API booking publik (src/routes/api/booking).
import { ApiFailure, apiRequest } from "@/lib/api-client";

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

export { ApiFailure };

const request = apiRequest;

export const bookingApi = {
  services: () => request<Service[]>("/api/booking/services"),
  doctors: (serviceId: string) =>
    request<ApiDoctor[]>(
      `/api/booking/doctors?serviceId=${encodeURIComponent(serviceId)}`,
    ),
  availability: (doctorId: string, serviceId: string) =>
    request<{ doctorId: string; from: string; days: AvailabilityDay[] }>(
      `/api/booking/availability?doctorId=${encodeURIComponent(doctorId)}&serviceId=${encodeURIComponent(serviceId)}&days=7`,
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
