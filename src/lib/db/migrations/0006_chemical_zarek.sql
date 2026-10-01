ALTER TABLE "payments" ADD COLUMN "refund_recorded_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refund_metadata" jsonb;