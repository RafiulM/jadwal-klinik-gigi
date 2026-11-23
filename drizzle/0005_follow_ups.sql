CREATE TYPE "public"."follow_up_status" AS ENUM('pending', 'booked', 'done');--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"source_appointment_id" uuid,
	"booked_appointment_id" uuid,
	"due_date" date NOT NULL,
	"interval_days" integer,
	"status" "follow_up_status" DEFAULT 'pending' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_ups_source_appointment_id_unique" UNIQUE("source_appointment_id"),
	CONSTRAINT "follow_ups_interval_check" CHECK ("follow_ups"."interval_days" is null or "follow_ups"."interval_days" between 1 and 730),
	CONSTRAINT "follow_ups_booked_check" CHECK ("follow_ups"."status" <> 'booked' or "follow_ups"."booked_appointment_id" is not null),
	CONSTRAINT "follow_ups_notes_length" CHECK (char_length("follow_ups"."notes") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_source_appointment_id_appointments_id_fk" FOREIGN KEY ("source_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_booked_appointment_id_appointments_id_fk" FOREIGN KEY ("booked_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follow_ups_status_due_idx" ON "follow_ups" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "follow_ups_patient_idx" ON "follow_ups" USING btree ("patient_id");--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_follow_up_days_check" CHECK ("services"."default_follow_up_days" is null or "services"."default_follow_up_days" between 1 and 730);