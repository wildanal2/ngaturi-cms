import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* =====================================================
 * AUTH (Better Auth core schema — Google OAuth only)
 * Generated shape follows Better Auth conventions.
 * ===================================================== */

export const userRole = pgEnum("user_role", ["user", "admin", "moderator"]);
export const userStatus = pgEnum("user_status", [
  "active",
  "suspended",
  "deleted",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRole("role").notNull().default("user"),
  status: userStatus("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  issuer: text("issuer").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* =====================================================
 * APP: USER PROFILE (fields di luar Better Auth)
 * ===================================================== */

export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  phone: varchar("phone", { length: 50 }),
  freeInvitationUsed: boolean("free_invitation_used").notNull().default(false),
  businessSubscriptionExpiresAt: timestamp("business_subscription_expires_at"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* =====================================================
 * TEMPLATES
 * ===================================================== */

export const templateCategory = pgEnum("template_category", [
  "wedding",
  "khitan",
  "tahlil",
  "aqiqah",
  "engagement",
  "birthday",
  "generic",
]);
export const templateTier = pgEnum("template_tier", [
  "free",
  "basic",
  "premium",
]);

export const templates = pgTable(
  "templates",
  {
    id: varchar("id", { length: 50 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: templateCategory("category").notNull(),
    tier: templateTier("tier").notNull().default("free"),
    previewImages: text("preview_images").array().notNull().default(sql`'{}'`),
    thumbnail: text("thumbnail"),
    composition: jsonb("composition").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    usageCount: integer("usage_count").notNull().default(0),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_templates_category").on(t.category),
    index("idx_templates_tier").on(t.tier),
  ],
);

/* =====================================================
 * INVITATIONS
 * ===================================================== */

export const invitationStatus = pgEnum("invitation_status", [
  "draft",
  "published",
  "archived",
  "expired",
]);
export const customizationLevel = pgEnum("customization_level", [
  "template-only",
  "content-only",
  "structure-modified",
  "heavily-customized",
]);
export const invitationPlan = pgEnum("invitation_plan", [
  "free_trial",
  "basic",
  "premium",
  "business",
]);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceTemplate: varchar("source_template", { length: 50 }).references(
      () => templates.id,
    ),
    sections: jsonb("sections").notNull().default(sql`'[]'::jsonb`),
    globalSettings: jsonb("global_settings")
      .notNull()
      .default(sql`'{}'::jsonb`),
    templateVersion: varchar("template_version", { length: 20 })
      .notNull()
      .default("1.0"),
    selectedDomain: varchar("selected_domain", { length: 255 })
      .notNull()
      .default("ngaturi.com"),
    customDomain: varchar("custom_domain", { length: 255 }),

    plan: invitationPlan("plan").notNull().default("free_trial"),
    isPaid: boolean("is_paid").notNull().default(false),
    hasWatermark: boolean("has_watermark").notNull().default(true),
    editExpiresAt: timestamp("edit_expires_at"),
    isEditLocked: boolean("is_edit_locked").notNull().default(false),
    paidAt: timestamp("paid_at"),

    status: invitationStatus("status").notNull().default("draft"),
    customizationLevel: customizationLevel("customization_level")
      .notNull()
      .default("template-only"),
    viewCount: integer("view_count").notNull().default(0),
    uniqueVisitors: integer("unique_visitors").notNull().default(0),

    eventType: templateCategory("event_type").notNull().default("wedding"),
    eventDate: timestamp("event_date"),
    eventTitle: varchar("event_title", { length: 255 }),

    publishedAt: timestamp("published_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_invitations_user").on(t.userId),
    index("idx_invitations_status").on(t.status),
    index("idx_invitations_event_date").on(t.eventDate),
    uniqueIndex("idx_invitations_one_free_trial")
      .on(t.userId)
      .where(sql`plan = 'free_trial'`),
  ],
);

/* =====================================================
 * GUEST INVITES (undangan per-tamu / ?to=)
 * ===================================================== */

export const guestInvites = pgTable(
  "guest_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" }),
    guestName: varchar("guest_name", { length: 255 }).notNull(),
    slugToken: varchar("slug_token", { length: 40 }).notNull(),
    guestGroup: varchar("guest_group", { length: 100 }),
    maxGuests: integer("max_guests").notNull().default(2),
    whatsappPhone: varchar("whatsapp_phone", { length: 50 }),
    isSent: boolean("is_sent").notNull().default(false),
    sentAt: timestamp("sent_at"),
    openedAt: timestamp("opened_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_guest_invites_invitation").on(t.invitationId),
    uniqueIndex("idx_guest_invites_token").on(t.invitationId, t.slugToken),
  ],
);

/* =====================================================
 * RSVP
 * ===================================================== */

export const rsvpStatus = pgEnum("rsvp_status", [
  "pending",
  "attending",
  "not_attending",
  "maybe",
]);
export const guestType = pgEnum("guest_type", ["regular", "vip", "family"]);

export const rsvpResponses = pgTable(
  "rsvp_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" }),
    guestInviteId: uuid("guest_invite_id").references(() => guestInvites.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    status: rsvpStatus("status").notNull().default("pending"),
    guestCount: integer("guest_count").notNull().default(1),
    guestCategory: guestType("guest_category").notNull().default("regular"),
    message: text("message"),
    dietaryRestrictions: text("dietary_restrictions"),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_rsvp_invitation").on(t.invitationId),
    index("idx_rsvp_status").on(t.status),
    uniqueIndex("idx_rsvp_unique_email")
      .on(t.invitationId, sql`lower(email)`)
      .where(sql`email is not null`),
    uniqueIndex("idx_rsvp_unique_phone")
      .on(t.invitationId, t.phone)
      .where(sql`phone is not null`),
  ],
);

/* =====================================================
 * GUESTBOOK / UCAPAN
 * ===================================================== */

export const guestbookStatus = pgEnum("guestbook_status", [
  "pending",
  "approved",
  "rejected",
  "spam",
]);

export const guestbookMessages = pgTable(
  "guestbook_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    message: text("message").notNull(),
    mediaUrl: text("media_url"),
    mediaType: varchar("media_type", { length: 50 }),
    status: guestbookStatus("status").notNull().default("pending"),
    isPinned: boolean("is_pinned").notNull().default(false),
    likesCount: integer("likes_count").notNull().default(0),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_guestbook_invitation").on(t.invitationId),
    index("idx_guestbook_status").on(t.status),
  ],
);

/* =====================================================
 * MEDIA
 * ===================================================== */

export const mediaKind = pgEnum("media_kind", [
  "image",
  "video",
  "audio",
  "document",
]);
export const mediaPurpose = pgEnum("media_purpose", [
  "gallery",
  "hero",
  "profile",
  "guestbook",
  "music",
  "other",
]);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    invitationId: uuid("invitation_id").references(() => invitations.id, {
      onDelete: "cascade",
    }),
    originalFilename: varchar("original_filename", { length: 255 }),
    fileKey: varchar("file_key", { length: 500 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    mediaType: mediaKind("media_type").notNull(),
    mediaPurpose: mediaPurpose("media_purpose").notNull().default("other"),
    width: integer("width"),
    height: integer("height"),
    blurHash: varchar("blur_hash", { length: 100 }),
    isProcessed: boolean("is_processed").notNull().default(false),
    processedVariants: jsonb("processed_variants")
      .notNull()
      .default(sql`'{}'::jsonb`),
    altText: varchar("alt_text", { length: 255 }),
    caption: text("caption"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_media_user").on(t.userId),
    index("idx_media_invitation").on(t.invitationId),
  ],
);

/* =====================================================
 * PAYMENTS
 * ===================================================== */

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
  "expired",
]);
export const paymentProvider = pgEnum("payment_provider", [
  "midtrans",
  "xendit",
  "manual",
]);
export const purchaseKind = pgEnum("purchase_kind", [
  "invitation_unlock",
  "invitation_renewal",
  "business_subscription",
]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => users.id),
    invitationId: uuid("invitation_id").references(() => invitations.id),
    provider: paymentProvider("provider").notNull(),
    providerPaymentId: varchar("provider_payment_id", { length: 255 }),
    providerOrderId: varchar("provider_order_id", { length: 255 }).unique(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("IDR"),
    status: paymentStatus("status").notNull().default("pending"),
    kind: purchaseKind("kind").notNull(),
    planTier: varchar("plan_tier", { length: 50 }).notNull(),
    grantUntil: timestamp("grant_until"),
    rawWebhook: jsonb("raw_webhook"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_payments_user").on(t.userId),
    index("idx_payments_status").on(t.status),
    index("idx_payments_invitation").on(t.invitationId),
  ],
);

/* =====================================================
 * MUSIC CATALOG (dikelola admin — dipilih di section musik)
 * ===================================================== */

export const musicTracks = pgTable(
  "music_tracks",
  {
    id: varchar("id", { length: 60 }).primaryKey(), // slug: "acoustic-morning"
    title: varchar("title", { length: 200 }).notNull(),
    artist: varchar("artist", { length: 200 }),
    audioUrl: text("audio_url").notNull(),
    coverUrl: text("cover_url"),
    license: varchar("license", { length: 120 }), // "CC0", "CC-BY 4.0", ...
    attribution: text("attribution"),
    genre: varchar("genre", { length: 80 }),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_music_active").on(t.isActive)],
);

/* =====================================================
 * ANALYTICS (minimal — detail di Phase 2)
 * ===================================================== */

export const invitationViews = pgTable(
  "invitation_views",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" }),
    visitorId: varchar("visitor_id", { length: 100 }).notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    deviceType: varchar("device_type", { length: 50 }),
    country: varchar("country", { length: 2 }),
    viewedAt: timestamp("viewed_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_views_invitation").on(t.invitationId),
    index("idx_views_date").on(t.viewedAt),
  ],
);
