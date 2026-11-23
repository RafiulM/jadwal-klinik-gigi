ALTER TABLE "appointments" ADD COLUMN "status_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "status_changed_by" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_status_changed_by_user_id_fk" FOREIGN KEY ("status_changed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status","appointment_date");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_notes_length" CHECK ("appointments"."notes" is null or char_length("appointments"."notes") <= 2000);--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_completed_at_status" CHECK ("appointments"."completed_at" is null or "appointments"."status" = 'completed');