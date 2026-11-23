CREATE UNIQUE INDEX "services_name_lower_idx" ON "services" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "doctor_services_service_idx" ON "doctor_services" USING btree ("service_id");--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_duration_check" CHECK ("services"."estimated_duration_minutes" between 5 and 240);