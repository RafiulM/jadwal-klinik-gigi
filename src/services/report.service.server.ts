import { and, asc, between, count, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db/index.server";
import { appointments, doctorSchedules, doctors } from "@/db/schema";
import { addDays, clinicNow, dayOfWeek } from "@/lib/clinic-time";

// Rekap harian pemilik: agregasi kunjungan per tanggal, dokter, dan status.
// Fungsi bersufiks Any hanya dipanggil dari endpoint berizin reports:read.

type Counts = {
  total: number;
  completed: number;
  noShow: number;
  waiting: number;
};

/**
 * Jumlah janji temu per tanggal & dokter dalam rentang, dipecah per status
 * (selesai, tidak datang, belum ditangani/menunggu). Dihitung di database.
 */
export async function countVisitsByDayAny(from: string, to: string) {
  const rows = await db
    .select({
      date: appointments.appointmentDate,
      doctorId: doctors.id,
      doctorName: doctors.name,
      total: count(),
      completed:
        sql<number>`count(*) filter (where ${appointments.status} = 'completed')`.mapWith(
          Number,
        ),
      noShow:
        sql<number>`count(*) filter (where ${appointments.status} = 'no_show')`.mapWith(
          Number,
        ),
      waiting:
        sql<number>`count(*) filter (where ${appointments.status} = 'scheduled')`.mapWith(
          Number,
        ),
    })
    .from(appointments)
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .where(between(appointments.appointmentDate, from, to))
    .groupBy(appointments.appointmentDate, doctors.id, doctors.name)
    .orderBy(asc(appointments.appointmentDate), asc(doctors.name));
  return rows;
}

function sum(rows: Counts[]): Counts {
  return rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      completed: acc.completed + r.completed,
      noShow: acc.noShow + r.noShow,
      waiting: acc.waiting + r.waiting,
    }),
    { total: 0, completed: 0, noShow: 0, waiting: 0 },
  );
}

/**
 * Rekap `days` hari berakhir di `date` (default hari ini, zona klinik):
 * per hari — dokter dengan jumlah per status, total klinik, dan jumlah dokter
 * aktif yang punya jam praktik di hari itu (0 berarti klinik tutup).
 */
export async function getDailyReportAny(input: {
  date?: string;
  days: number;
}) {
  const today = clinicNow().date;
  const date = input.date && input.date < today ? input.date : today;
  const from = addDays(date, -(input.days - 1));

  const [visits, schedules] = await Promise.all([
    countVisitsByDayAny(from, date),
    db
      .selectDistinct({
        doctorId: doctorSchedules.doctorId,
        dayOfWeek: doctorSchedules.dayOfWeek,
      })
      .from(doctorSchedules)
      .innerJoin(doctors, eq(doctors.id, doctorSchedules.doctorId))
      .where(
        and(eq(doctorSchedules.isActive, true), eq(doctors.isActive, true)),
      ),
  ]);

  const doctorIdsWithVisits = [...new Set(visits.map((v) => v.doctorId))];
  const doctorList = await db
    .select({ id: doctors.id, name: doctors.name })
    .from(doctors)
    .where(
      doctorIdsWithVisits.length
        ? or(
            eq(doctors.isActive, true),
            inArray(doctors.id, doctorIdsWithVisits),
          )
        : eq(doctors.isActive, true),
    )
    .orderBy(asc(doctors.name));

  const days = Array.from({ length: input.days }, (_, i) => {
    const day = addDays(from, i);
    const dow = dayOfWeek(day);
    const doctorsOfDay = visits
      .filter((v) => v.date === day)
      .map((v) => ({
        id: v.doctorId,
        name: v.doctorName,
        total: v.total,
        completed: v.completed,
        noShow: v.noShow,
        waiting: v.waiting,
      }));
    return {
      date: day,
      dayOfWeek: dow,
      doctors: doctorsOfDay,
      practicingDoctors: new Set(
        schedules.filter((s) => s.dayOfWeek === dow).map((s) => s.doctorId),
      ).size,
      ...sum(doctorsOfDay),
    };
  });

  return { today, date, days, doctors: doctorList };
}

export type DailyReport = Awaited<ReturnType<typeof getDailyReportAny>>;
