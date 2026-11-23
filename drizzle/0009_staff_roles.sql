-- Peran staf klinik di kolom user.role (bisa gabungan, mis. "admin,dokter").
-- 1) Akun yang sudah ditautkan ke data dokter mendapat peran dokter.
UPDATE "user" SET "role" = CASE
    WHEN "role" IS NULL OR "role" = '' OR "role" = 'user' THEN 'dokter'
    ELSE "role" || ',dokter'
  END
WHERE "id" IN (SELECT "user_id" FROM "doctors" WHERE "user_id" IS NOT NULL)
  AND ("role" IS NULL OR NOT ('dokter' = ANY (string_to_array("role", ','))));--> statement-breakpoint
-- 2) Peran lain yang tidak dikenal aplikasi dikosongkan (kembali ke bawaan).
UPDATE "user" SET "role" = NULL
WHERE "role" IS NOT NULL AND "role" !~ '^(user|admin|dokter|pemilik)(,(user|admin|dokter|pemilik))*$';--> statement-breakpoint
-- 3) Hanya peran yang dikenal yang boleh disimpan.
ALTER TABLE "user" ADD CONSTRAINT "user_role_check" CHECK ("user"."role" is null or "user"."role" ~ '^(user|admin|dokter|pemilik)(,(user|admin|dokter|pemilik))*$');