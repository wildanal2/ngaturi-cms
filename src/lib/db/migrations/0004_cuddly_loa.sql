DROP INDEX "idx_invitations_one_free_trial";--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "invitation_quota_bonus" integer DEFAULT 0 NOT NULL;