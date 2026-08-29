CREATE TYPE "public"."customization_level" AS ENUM('template-only', 'content-only', 'structure-modified', 'heavily-customized');--> statement-breakpoint
CREATE TYPE "public"."guest_type" AS ENUM('regular', 'vip', 'family');--> statement-breakpoint
CREATE TYPE "public"."guestbook_status" AS ENUM('pending', 'approved', 'rejected', 'spam');--> statement-breakpoint
CREATE TYPE "public"."invitation_plan" AS ENUM('free_trial', 'basic', 'premium', 'business');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('draft', 'published', 'archived', 'expired');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'video', 'audio', 'document');--> statement-breakpoint
CREATE TYPE "public"."media_purpose" AS ENUM('gallery', 'hero', 'profile', 'guestbook', 'music', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('midtrans', 'xendit', 'manual');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded', 'expired');--> statement-breakpoint
CREATE TYPE "public"."purchase_kind" AS ENUM('invitation_unlock', 'invitation_renewal', 'business_subscription');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('pending', 'attending', 'not_attending', 'maybe');--> statement-breakpoint
CREATE TYPE "public"."template_category" AS ENUM('wedding', 'khitan', 'tahlil', 'aqiqah', 'engagement', 'birthday', 'generic');--> statement-breakpoint
CREATE TYPE "public"."template_tier" AS ENUM('free', 'basic', 'premium');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'moderator');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"guest_name" varchar(255) NOT NULL,
	"slug_token" varchar(40) NOT NULL,
	"guest_group" varchar(100),
	"max_guests" integer DEFAULT 2 NOT NULL,
	"whatsapp_phone" varchar(50),
	"is_sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guestbook_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"media_url" text,
	"media_type" varchar(50),
	"status" "guestbook_status" DEFAULT 'pending' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"ip_address" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation_views" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"invitation_id" uuid NOT NULL,
	"visitor_id" varchar(100) NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text,
	"referrer" text,
	"device_type" varchar(50),
	"country" varchar(2),
	"viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"user_id" text NOT NULL,
	"source_template" varchar(50),
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"global_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"template_version" varchar(20) DEFAULT '1.0' NOT NULL,
	"selected_domain" varchar(255) DEFAULT 'ngaturi.com' NOT NULL,
	"custom_domain" varchar(255),
	"plan" "invitation_plan" DEFAULT 'free_trial' NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"has_watermark" boolean DEFAULT true NOT NULL,
	"edit_expires_at" timestamp,
	"is_edit_locked" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp,
	"status" "invitation_status" DEFAULT 'draft' NOT NULL,
	"customization_level" "customization_level" DEFAULT 'template-only' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	"event_type" "template_category" DEFAULT 'wedding' NOT NULL,
	"event_date" timestamp,
	"event_title" varchar(255),
	"published_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"invitation_id" uuid,
	"original_filename" varchar(255),
	"file_key" varchar(500) NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"media_type" "media_kind" NOT NULL,
	"media_purpose" "media_purpose" DEFAULT 'other' NOT NULL,
	"width" integer,
	"height" integer,
	"blur_hash" varchar(100),
	"is_processed" boolean DEFAULT false NOT NULL,
	"processed_variants" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"alt_text" varchar(255),
	"caption" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"invitation_id" uuid,
	"provider" "payment_provider" NOT NULL,
	"provider_payment_id" varchar(255),
	"provider_order_id" varchar(255),
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'IDR' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"kind" "purchase_kind" NOT NULL,
	"plan_tier" varchar(50) NOT NULL,
	"grant_until" timestamp,
	"raw_webhook" jsonb,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_provider_order_id_unique" UNIQUE("provider_order_id")
);
--> statement-breakpoint
CREATE TABLE "rsvp_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"guest_invite_id" uuid,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"status" "rsvp_status" DEFAULT 'pending' NOT NULL,
	"guest_count" integer DEFAULT 1 NOT NULL,
	"guest_category" "guest_type" DEFAULT 'regular' NOT NULL,
	"message" text,
	"dietary_restrictions" text,
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" "template_category" NOT NULL,
	"tier" "template_tier" DEFAULT 'free' NOT NULL,
	"preview_images" text[] DEFAULT '{}' NOT NULL,
	"thumbnail" text,
	"composition" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"meta_title" varchar(255),
	"meta_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"phone" varchar(50),
	"free_invitation_used" boolean DEFAULT false NOT NULL,
	"business_subscription_expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_invites" ADD CONSTRAINT "guest_invites_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guestbook_messages" ADD CONSTRAINT "guestbook_messages_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_views" ADD CONSTRAINT "invitation_views_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_source_template_templates_id_fk" FOREIGN KEY ("source_template") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_responses" ADD CONSTRAINT "rsvp_responses_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_responses" ADD CONSTRAINT "rsvp_responses_guest_invite_id_guest_invites_id_fk" FOREIGN KEY ("guest_invite_id") REFERENCES "public"."guest_invites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_guest_invites_invitation" ON "guest_invites" USING btree ("invitation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_guest_invites_token" ON "guest_invites" USING btree ("invitation_id","slug_token");--> statement-breakpoint
CREATE INDEX "idx_guestbook_invitation" ON "guestbook_messages" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "idx_guestbook_status" ON "guestbook_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_views_invitation" ON "invitation_views" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "idx_views_date" ON "invitation_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "idx_invitations_user" ON "invitations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_invitations_status" ON "invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_invitations_event_date" ON "invitations" USING btree ("event_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invitations_one_free_trial" ON "invitations" USING btree ("user_id") WHERE plan = 'free_trial';--> statement-breakpoint
CREATE INDEX "idx_media_user" ON "media_assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_media_invitation" ON "media_assets" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "idx_payments_user" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payments_invitation" ON "payments" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "idx_rsvp_invitation" ON "rsvp_responses" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "idx_rsvp_status" ON "rsvp_responses" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rsvp_unique_email" ON "rsvp_responses" USING btree ("invitation_id",lower(email)) WHERE email is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rsvp_unique_phone" ON "rsvp_responses" USING btree ("invitation_id","phone") WHERE phone is not null;--> statement-breakpoint
CREATE INDEX "idx_templates_category" ON "templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_templates_tier" ON "templates" USING btree ("tier");