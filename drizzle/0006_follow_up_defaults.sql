-- Interval kontrol rutin bawaan: scaling tiap 6 bulan (180 hari), kontrol behel
-- tiap bulan (30 hari). Hanya mengisi yang masih kosong, jadi interval yang
-- sudah diatur admin tidak ditimpa.
UPDATE "services" SET "default_follow_up_days" = 180
WHERE "default_follow_up_days" IS NULL AND lower("name") LIKE '%scaling%';--> statement-breakpoint
UPDATE "services" SET "default_follow_up_days" = 30
WHERE "default_follow_up_days" IS NULL AND lower("name") LIKE '%behel%';
