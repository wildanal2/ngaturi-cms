CREATE TABLE "music_tracks" (
	"id" varchar(60) PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"artist" varchar(200),
	"audio_url" text NOT NULL,
	"cover_url" text,
	"license" varchar(120),
	"attribution" text,
	"genre" varchar(80),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_music_active" ON "music_tracks" USING btree ("is_active");