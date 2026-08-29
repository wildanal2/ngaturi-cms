# 📋 PRD: Platform Generator Undangan Digital

## Dokumen Version 1.1 — Complete Build Specification

> **Changelog v1.1** — direvisi sesuai rekomendasi teknis & keputusan bisnis:
> - Framework dinaikkan ke **Next.js 16** (App Router, async request APIs, Cache Components).
> - **Auth: Google OAuth WAJIB** (satu-satunya metode). Tidak ada email/password.
> - **Model bisnis: one-time payment per undangan**, bukan subscription. User baru dapat **1 undangan gratis dengan masa edit 7 hari**; setelah itu builder terkunci sampai bayar (mulai Rp 49k).
> - Tabel auth digenerate lewat Better Auth CLI (tidak ditulis manual).
> - Revalidation halaman undangan pakai **tag-based on-demand** (bukan pre-render massal).
> - API publik dipindah ke `app/api/public/[slug]/...` (bukan nested di `[slug]`).
> - Middleware Edge-safe (cek cookie saja, verifikasi role di server component).
> - Builder localStorage = draft-only; server `updated_at` tetap source of truth.
> - Ditambah: undangan per-tamu (`?to=`), anti-spam, kebijakan retensi data & PII.
> - BullMQ worker ditunda ke Phase 2; MVP pakai Vercel Cron + `after()`.

---

# BAGIAN 1: PRODUCT REQUIREMENTS DOCUMENT

## 1.1 Vision & Mission

**Vision:** Menjadi platform #1 di Indonesia untuk membuat undangan digital (pernikahan, khitan, tahlil, aqiqah, dll) yang beautiful, fast, dan affordable.

**Mission:** Memberikan kemampuan untuk setiap orang membuat undangan digital yang professional dalam hitungan menit, tanpa perlu skill design atau coding.

## 1.2 Problem Statement

| Problem | Impact |
|---------|--------|
| Undangan fisik mahal (Rp 500k - 5jt) | Tidak affordable untuk semua kalangan |
| WhatsApp broadcast tidak professional | Tidak ada RSVP, guestbook, countdown |
| Jasa undangan digital custom mahal & lama | Rp 200k-1jt, butuh 3-7 hari |
| Existing platform tidak flexible | Template kaku, tidak bisa customize |
| Tidak ada unified platform untuk semua jenis acara | Pernikahan saja, khitan/tahlil terpisah |

## 1.3 Target Users

| Persona | Demographic | Needs | Willingness to Pay |
|---------|-------------|-------|-------------------|
| **Muda-mudi yang akan menikah** | 25-35 tahun, urban, tech-savvy | Quick, beautiful, shareable via WA/IG | Rp 50k-150k |
| **Orang tua anak khitan/aqiqah** | 35-50 tahun, suburban | Simple, Islamic-friendly, easy to share | Rp 30k-100k |
| **Event organizer** | B2B, managing multiple events | Bulk creation, custom domain, white-label | Rp 500k-2jt/bulan |
| **Komunitas religius** | Tahlil, pengajian, majelis | Islamic templates, simple flow | Rp 30k-80k |

## 1.4 Core Features

### Must-Have (MVP)
- [ ] User authentication (**Google OAuth wajib — satu-satunya metode**, no email/password)
- [ ] Free trial gating: 1 undangan gratis, masa edit 7 hari sejak dibuat, lalu builder terkunci sampai bayar
- [ ] Undangan per-tamu (personalisasi nama via `?to=` di share link)
- [ ] Template gallery (browse, preview, select)
- [ ] Section-based builder (edit content, ganti variant, reorder)
- [ ] Live preview (mobile-first view)
- [ ] RSVP system (form + management dashboard)
- [ ] Guestbook/Ucapan (with real-time updates)
- [ ] Photo gallery (upload to S3, optimize)
- [ ] Countdown timer
- [ ] Share link (WhatsApp, copy link, QR code)
- [ ] Basic analytics (views, unique visitors)

### Should-Have (Phase 2)
- [ ] Multiple domain support
- [ ] Custom theme colors & fonts
- [ ] Music/background audio
- [ ] Video embed (YouTube/Vimeo)
- [ ] Gift/amplop digital (bank transfer, e-wallet QR)
- [ ] Advanced analytics (geo, device, referrer)
- [ ] Export guest list (CSV/Excel)

### Could-Have (Phase 3)
- [ ] Custom domain per user
- [ ] White-label for event organizers
- [ ] Template marketplace (community)
- [ ] AI-powered content generation
- [ ] WhatsApp API integration (send invitation directly)
- [ ] Multi-language (ID, EN, AR)

### Won't-Have (Out of Scope)
- Native mobile apps (PWA is enough)
- Payment processing for gifts (external links only)
- Complex CMS for non-invitation pages

## 1.5 Business Model

**Model: one-time payment per undangan** (bukan subscription). User bayar sekali untuk meng-unlock 1 undangan; undangan aktif sampai `expires_at` (hari-H + 30 hari, bisa diperpanjang berbayar). Tier **Business** tetap subscription bulanan untuk event organizer.

### Free Trial (default semua user baru)
- Otomatis dapat **1 undangan gratis** saat pertama login.
- **Masa edit 7 hari** sejak undangan dibuat (`edit_expires_at = created_at + 7 hari`).
- Selama trial: bisa publish, share, terima RSVP & ucapan, tapi **ada watermark** "Dibuat dengan [Platform]" + galeri maks 5 foto.
- Setelah 7 hari **atau** saat mau hilangkan watermark / naik kuota: builder **read-only** sampai user upgrade undangan tsb.
- Undangan yang sudah dipublish **tetap online** walau trial habis (tidak di-takedown) — hanya editing yang terkunci.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    PRICING (one-time per undangan)                     │
├───────────────┬─────────────┬──────────────┬─────────────────────────┤
│  FREE TRIAL   │   BASIC     │   PREMIUM    │   BUSINESS (subscription)│
│  Rp 0         │  Rp 49k     │  Rp 99k      │   Rp 499k / bulan        │
├───────────────┼─────────────┼──────────────┼─────────────────────────┤
│ 1 undangan    │ per undangan│ per undangan │ Unlimited undangan       │
│ Edit 7 hari   │ Edit selama │ Edit selama  │ Edit selamanya           │
│ Watermark     │ aktif       │ aktif        │ White-label              │
│ 5 foto        │ No watermark│ No watermark │ Custom domain            │
│ Basic RSVP    │ 30 foto     │ Foto unlimited│ Priority support        │
│ Basic template│ RSVP+Guest  │ +Video+Music │ API access               │
│               │ +Analytics  │ +Undangan per-tamu│ Bulk import          │
│               │ All basic tpl│ +Adv analytics│                        │
│               │             │ All premium tpl│                        │
└───────────────┴─────────────┴──────────────┴─────────────────────────┘
```

**Perpanjangan:** setelah `expires_at`, undangan diarsipkan. User bisa bayar Rp 25k untuk memperpanjang 90 hari + akses download galeri/ucapan.

## 1.6 Success Metrics (KPIs)

| Metric | Target (6 months) | Target (12 months) |
|--------|-------------------|---------------------|
| Total registered users | 10,000 | 50,000 |
| Invitations created | 5,000 | 25,000 |
| Conversion rate (trial → paid undangan) | 8% | 12% |
| Average revenue per paying user | Rp 65k | Rp 80k |
| Gross revenue / bulan | Rp 25jt | Rp 150jt |
| Perpanjangan (renewal) rate | 10% | 15% |

---

# BAGIAN 2: TECH STACK DECISION

## 2.1 Architecture Decision: Next.js Monolith vs Separate Backend

### Recommended: Next.js 16 (App Router) + Hybrid Services

> Catatan Next.js 16: request APIs (`cookies()`, `headers()`, `params`, `searchParams`) **async — wajib di-`await`**. `next/image` default `qualities`/`localPatterns` lebih ketat. Cache Components (`use cache`, `cacheLife`, `cacheTag`) menggantikan pola `unstable_cache`. Middleware tetap Edge runtime (tidak boleh akses DB langsung).

```
┌─────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE DIAGRAM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌─────────────────────────────┐        │
│  │   Client    │────▶│   Next.js 15 (App Router)   │        │
│  │  (Browser)  │     │                             │        │
│  └─────────────┘     │  ┌─────────────────────┐   │        │
│                      │  │   App Pages (SSR)   │   │        │
│  ┌─────────────┐     │  ├─────────────────────┤   │        │
│  │  Dashboard  │────▶│  │  Server Actions     │   │        │
│  │  (Builder)  │     │  ├─────────────────────┤   │        │
│  └─────────────┘     │  │  API Routes         │   │        │
│                      │  └─────────────────────┘   │        │
│  ┌─────────────┐     │                             │        │
│  │  Public     │────▶│  ┌─────────────────────┐   │        │
│  │  Invitation │     │  │  [slug] Dynamic     │   │        │
│  │  Pages      │     │  │  Routes (ISR)       │   │        │
│  └─────────────┘     │  └─────────────────────┘   │        │
│                      └─────────┬───────────────────┘        │
│                                │                             │
│                    ┌───────────┼───────────┐                │
│                    │           │           │                │
│                    ▼           ▼           ▼                │
│              ┌─────────┐ ┌─────────┐ ┌──────────┐          │
│              │PostgreSQL│ │  Redis  │ │S3/R2/    │          │
│              │(Primary) │ │ (Cache) │ │MinIO     │          │
│              └─────────┘ └─────────┘ └──────────┘          │
│                                                              │
│  ┌─────────────────────────────────────────────────┐        │
│  │         Background Worker (BullMQ + Redis)       │        │
│  │  • Image optimization                           │        │
│  │  • Email sending                                │        │
│  │  • Analytics aggregation                        │        │
│  └─────────────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Decision: TIDAK PERLU ElysiaJS untuk MVP

**Alasan:**

1. **Next.js Server Actions + API Routes cukup** untuk 95% use case MVP
2. **TypeScript end-to-end** sudah terjaga tanpa perlu Eden/tRPC tambahan
3. **Deployment lebih simple** — satu Vercel/Cloudflare project
4. **Server Actions** di Next.js 16 sudah sangat powerful untuk mutations
5. **Background jobs MVP** cukup pakai Vercel Cron + `after()` (dari `next/server`). BullMQ worker terpisah **ditunda ke Phase 2** saat volume image processing sudah tinggi.

**Kapan butuh ElysiaJS terpisah (Phase 3+):**
- Real-time WebSocket untuk RSVP notifications (ElysiaJS + Bun sangat cepat untuk ini)
- Heavy image processing API
- Public API untuk third-party integrations
- White-label multi-tenant dengan routing kompleks

## 2.2 Final Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Framework** | Next.js 16 (App Router) | SSR/ISR, Server Actions, Cache Components, async request APIs |
| **Language** | TypeScript (strict mode) | Type safety, better DX |
| **Runtime** | Node.js 22 LTS (production) / Bun (dev, optional) | Stability + performance |
| **Database** | PostgreSQL 16 | JSONB untuk sections, relational untuk users/RSVP |
| **ORM** | Drizzle ORM | Type-safe, lightweight, SQL-like syntax |
| **Cache** | Redis 7 | Session, rate limiting, ISR cache, BullMQ |
| **Storage** | S3-compatible (Cloudflare R2 / MinIO) | Zero egress fee (R2), self-hosted option (MinIO) |
| **Auth** | Better Auth (**Google OAuth only**) | Next.js-native; tabel auth digenerate via Better Auth CLI, session di Redis. Tidak ada email/password. |
| **Styling** | Tailwind CSS 4 + CSS Modules (untuk section isolation) | Utility + scoped |
| **UI Components** | shadcn/ui (dashboard) + Custom (sections) | Consistency + flexibility |
| **State Management** | Zustand + React Hook Form | Builder state + form handling |
| **Validation** | Zod | Schema validation for sections, forms, API |
| **Background Jobs** | MVP: Vercel Cron + `after()` · Phase 2: BullMQ | Image processing, emails, analytics aggregation |
| **Email** | Resend / AWS SES | Transactional emails |
| **Deployment** | Vercel (app) + Railway/Fly.io (worker) + Neon/Supabase (DB) | Managed, scalable |
| **Monitoring** | Sentry + Axiom | Error tracking + logging |

---

# BAGIAN 3: DATABASE SCHEMA

## 3.1 Complete PostgreSQL Schema

```sql
-- =====================================================
-- MIGRATION 001: Initial Schema
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS & AUTH
-- =====================================================
--
-- PENTING: tabel `users`, `sessions`, `accounts`, `verifications` TIDAK ditulis
-- manual. Digenerate oleh Better Auth CLI (`npx @better-auth/cli generate`) ke
-- schema Drizzle. Better Auth dikonfigurasi:
--   - hanya provider Google (socialProviders.google), emailAndPassword: false
--   - user.modelName = "users", generateId pakai uuid
--   - additionalFields di user: role, status, is_admin (lihat auth/config.ts)
--
-- Kolom app-level yang BUKAN milik Better Auth ditaruh di tabel terpisah
-- di bawah ini supaya `cli generate` tidak menimpanya.

CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');

-- Struktur `users` (referensi — dikelola Better Auth, jangan migrate manual):
--   id UUID PK, email, email_verified BOOLEAN, name, image TEXT,
--   role user_role DEFAULT 'user', status user_status DEFAULT 'active',
--   created_at, updated_at

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(50),
  -- Free trial & entitlement (per-user, sekali seumur akun)
  free_invitation_used BOOLEAN DEFAULT false, -- true setelah user bikin undangan gratis pertama
  -- Business-tier subscription (opsional, hanya untuk event organizer)
  business_subscription_expires_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TEMPLATES
-- =====================================================

CREATE TYPE template_category AS ENUM ('wedding', 'khitan', 'tahlil', 'aqiqah', 'engagement', 'birthday', 'generic');
CREATE TYPE template_tier AS ENUM ('free', 'basic', 'premium');

CREATE TABLE templates (
  id VARCHAR(50) PRIMARY KEY, -- 'elegant-gold', 'rustic-minimal', etc
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category template_category NOT NULL,
  tier template_tier DEFAULT 'free',
  -- Preview assets
  preview_images TEXT[] DEFAULT '{}',
  preview_video TEXT,
  thumbnail TEXT, -- main thumbnail for gallery
  -- The JSON composition (source of truth for template)
  composition JSONB NOT NULL,
  -- Template metadata
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_tier ON templates(tier);
CREATE INDEX idx_templates_active ON templates(is_active) WHERE is_active = true;
-- GIN index for querying JSONB composition
CREATE INDEX idx_templates_composition ON templates USING GIN(composition);

-- =====================================================
-- INVITATIONS
-- =====================================================

CREATE TYPE invitation_status AS ENUM ('draft', 'published', 'archived', 'expired');
CREATE TYPE customization_level AS ENUM ('template-only', 'content-only', 'structure-modified', 'heavily-customized');
CREATE TYPE invitation_plan AS ENUM ('free_trial', 'basic', 'premium', 'business');

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source_template VARCHAR(50) REFERENCES templates(id),
  -- The customized composition (user's version)
  sections JSONB NOT NULL DEFAULT '[]',
  global_settings JSONB DEFAULT '{}',
  template_version VARCHAR(20) DEFAULT '1.0',
  -- Domain
  selected_domain VARCHAR(255) DEFAULT 'undangan.com',
  custom_domain VARCHAR(255),
  -- Plan & entitlement (one-time payment per undangan)
  plan invitation_plan DEFAULT 'free_trial',
  is_paid BOOLEAN DEFAULT false,
  has_watermark BOOLEAN DEFAULT true,           -- false setelah bayar basic/premium
  edit_expires_at TIMESTAMP,                    -- free_trial: created_at + 7 hari; paid: NULL (edit selama aktif)
  is_edit_locked BOOLEAN DEFAULT false,         -- true kalau edit_expires_at lewat & belum bayar (di-set oleh cron / saat load builder)
  paid_at TIMESTAMP,
  -- Status & Analytics
  status invitation_status DEFAULT 'draft',
  customization_level customization_level DEFAULT 'template-only',
  view_count INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  -- Event details (for quick access, also stored in sections)
  event_type template_category DEFAULT 'wedding',
  event_date TIMESTAMP,
  event_title VARCHAR(255),
  -- Timestamps
  published_at TIMESTAMP,
  expires_at TIMESTAMP,                         -- akses publik: hari-H + 30 hari; setelah itu status='expired' & diarsipkan
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Catatan aturan trial:
--   * User baru: undangan pertama otomatis plan='free_trial', edit_expires_at = created_at + interval '7 days'.
--   * user_profiles.free_invitation_used di-set true saat undangan free_trial pertama dibuat.
--   * Undangan free_trial ke-2+ tidak diizinkan (harus bayar dulu undangan sebelumnya atau tier business).
--   * Undangan yang sudah published tetap tampil walau is_edit_locked = true.

CREATE INDEX idx_invitations_slug ON invitations(slug);
CREATE INDEX idx_invitations_user ON invitations(user_id);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_event_date ON invitations(event_date);
CREATE INDEX idx_invitations_sections ON invitations USING GIN(sections);
-- Untuk cron pengunci trial & pengarsip
CREATE INDEX idx_invitations_edit_expiry ON invitations(edit_expires_at) WHERE is_edit_locked = false AND is_paid = false;
CREATE INDEX idx_invitations_expiry ON invitations(expires_at) WHERE status = 'published';
-- Enforce: maks 1 undangan free_trial per user
CREATE UNIQUE INDEX idx_invitations_one_free_trial ON invitations(user_id) WHERE plan = 'free_trial';

-- =====================================================
-- SECTIONS METADATA (for analytics & marketplace)
-- =====================================================

CREATE TABLE section_types (
  id VARCHAR(50) PRIMARY KEY, -- 'hero', 'gallery', 'rsvp', etc
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'hero', 'content', 'interactive', 'footer'
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track which sections/variants are used (for analytics)
CREATE TABLE section_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
  section_type VARCHAR(50) REFERENCES section_types(id),
  variant VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_section_usage_type ON section_usage(section_type);

-- =====================================================
-- GUEST INVITES (undangan per-tamu / personalisasi ?to=)
-- =====================================================

CREATE TABLE guest_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
  guest_name VARCHAR(255) NOT NULL,      -- ditampilkan di cover: "Kepada Yth. {guest_name}"
  slug_token VARCHAR(40) NOT NULL,       -- token pendek untuk ?to=<token> (bukan nama mentah)
  guest_group VARCHAR(100),              -- "Keluarga", "Teman kantor", dll
  max_guests INTEGER DEFAULT 2,
  whatsapp_phone VARCHAR(50),
  -- Tracking distribusi
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,                   -- pertama kali link dibuka
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(invitation_id, slug_token)
);

CREATE INDEX idx_guest_invites_invitation ON guest_invites(invitation_id);

-- Fitur ini hanya untuk plan 'premium' & 'business' (lihat 1.5).

-- =====================================================
-- RSVP SYSTEM
-- =====================================================

CREATE TYPE rsvp_status AS ENUM ('pending', 'attending', 'not_attending', 'maybe');
CREATE TYPE guest_type AS ENUM ('regular', 'vip', 'family');

CREATE TABLE rsvp_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
  -- Guest info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  -- RSVP details
  status rsvp_status DEFAULT 'pending',
  guest_count INTEGER DEFAULT 1,
  max_guests INTEGER DEFAULT 2, -- per invitation setting
  guest_category guest_type DEFAULT 'regular',
  -- Additional info
  message TEXT, -- optional message from guest
  dietary_restrictions TEXT,
  -- Tracking
  ip_address INET,
  user_agent TEXT,
  is_verified BOOLEAN DEFAULT false, -- verified via WhatsApp/email
  verified_at TIMESTAMP,
  -- Check-in (for event day)
  checked_in_at TIMESTAMP,
  checked_in_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rsvp_invitation ON rsvp_responses(invitation_id);
CREATE INDEX idx_rsvp_status ON rsvp_responses(status);
-- Cegah duplikat: satu index partial per channel (email & phone), name TIDAK dipakai
-- sebagai kunci unik (dua tamu bisa punya nama sama). Dedup by-name ditangani soft di UI.
CREATE UNIQUE INDEX idx_rsvp_unique_email ON rsvp_responses(invitation_id, lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_rsvp_unique_phone ON rsvp_responses(invitation_id, phone)       WHERE phone IS NOT NULL;
-- Link opsional ke undangan per-tamu (lihat tabel guest_invites)
ALTER TABLE rsvp_responses ADD COLUMN guest_invite_id UUID REFERENCES guest_invites(id) ON DELETE SET NULL;

-- =====================================================
-- GUESTBOOK / UCAPAN
-- =====================================================

CREATE TYPE guestbook_status AS ENUM ('pending', 'approved', 'rejected', 'spam');

CREATE TABLE guestbook_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  -- Media (optional photo/video)
  media_url TEXT,
  media_type VARCHAR(50), -- 'image', 'video'
  -- Moderation
  status guestbook_status DEFAULT 'pending',
  is_pinned BOOLEAN DEFAULT false,
  -- Social
  likes_count INTEGER DEFAULT 0,
  -- Tracking
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_guestbook_invitation ON guestbook_messages(invitation_id);
CREATE INDEX idx_guestbook_status ON guestbook_messages(status);
CREATE INDEX idx_guestbook_created ON guestbook_messages(created_at DESC);

-- Anti-spam (wajib di endpoint POST publik untuk RSVP & guestbook):
--   1. Honeypot field tersembunyi (`_hp`) — kalau terisi, tolak diam-diam.
--   2. Cloudflare Turnstile token diverifikasi server-side.
--   3. Rate limit Redis: 3 submit / IP / menit, 10 / IP / jam.
--   4. Auto-flag 'spam' bila mengandung URL/link (regex) → butuh approval.
--   5. Owner bisa set require_approval per undangan (default true).

-- Guestbook likes (prevent double-like)
CREATE TABLE guestbook_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES guestbook_messages(id) ON DELETE CASCADE,
  -- Use fingerprint to prevent spam (IP + user agent hash)
  visitor_fingerprint VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, visitor_fingerprint)
);

-- =====================================================
-- MEDIA / FILE UPLOADS
-- =====================================================

CREATE TYPE media_type AS ENUM ('image', 'video', 'audio', 'document');
CREATE TYPE media_purpose AS ENUM ('gallery', 'hero', 'profile', 'guestbook', 'music', 'other');

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
  -- File info
  original_filename VARCHAR(255),
  file_key VARCHAR(500) NOT NULL, -- S3 key
  file_url TEXT NOT NULL, -- Full CDN URL
  file_size BIGINT NOT NULL, -- bytes
  mime_type VARCHAR(100) NOT NULL,
  media_type media_type NOT NULL,
  media_purpose media_purpose DEFAULT 'other',
  -- Image-specific
  width INTEGER,
  height INTEGER,
  blur_hash VARCHAR(100), -- for placeholder
  -- Processing status
  is_processed BOOLEAN DEFAULT false,
  processed_variants JSONB DEFAULT '{}', -- { thumbnail: url, medium: url, large: url }
  -- Metadata
  alt_text VARCHAR(255),
  caption TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_media_user ON media_assets(user_id);
CREATE INDEX idx_media_invitation ON media_assets(invitation_id);
CREATE INDEX idx_media_type ON media_assets(media_type);

-- =====================================================
-- ANALYTICS
-- =====================================================

CREATE TABLE invitation_views (
  id BIGSERIAL PRIMARY KEY,
  invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
  -- Visitor info
  visitor_id VARCHAR(100) NOT NULL, -- anonymous ID (localStorage/cookie)
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  -- Device info
  device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop'
  browser VARCHAR(100),
  os VARCHAR(100),
  -- Geo (from IP)
  country VARCHAR(2),
  city VARCHAR(100),
  -- Session
  session_duration INTEGER, -- seconds
  viewed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_views_invitation ON invitation_views(invitation_id);
CREATE INDEX idx_views_date ON invitation_views(viewed_at);
CREATE INDEX idx_views_visitor ON invitation_views(visitor_id);

-- Aggregated daily stats (for performance, populated by background job)
CREATE TABLE invitation_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  rsvp_count INTEGER DEFAULT 0,
  guestbook_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(invitation_id, date)
);

CREATE INDEX idx_stats_invitation_date ON invitation_daily_stats(invitation_id, date DESC);

-- =====================================================
-- PAYMENTS & SUBSCRIPTIONS
-- =====================================================

CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'expired');
CREATE TYPE payment_provider AS ENUM ('midtrans', 'xendit', 'manual');
CREATE TYPE purchase_kind AS ENUM ('invitation_unlock', 'invitation_renewal', 'business_subscription');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  invitation_id UUID REFERENCES invitations(id), -- NULL untuk business_subscription
  -- Payment details
  provider payment_provider NOT NULL,
  provider_payment_id VARCHAR(255),  -- transaction/order ID dari provider
  provider_order_id VARCHAR(255) UNIQUE, -- order_id yang kita generate, dikirim ke Snap
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'IDR',
  status payment_status DEFAULT 'pending',
  -- Apa yang dibeli
  kind purchase_kind NOT NULL,
  plan_tier VARCHAR(50) NOT NULL,    -- 'basic' | 'premium' | 'business'
  -- one-time unlock: grant_until NULL (permanen selama undangan aktif)
  -- renewal / subscription: grant_until diisi
  grant_until TIMESTAMP,
  -- Idempotensi webhook
  raw_webhook JSONB,
  -- Timestamps
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_invitation ON payments(invitation_id);

-- Webhook Midtrans: verifikasi signature_key = sha512(order_id + status_code + gross_amount + server_key).
-- Proses idempoten berdasarkan provider_order_id; abaikan event yang statusnya mundur.
-- Saat status -> 'paid':
--   kind='invitation_unlock'      => invitations.is_paid=true, plan=<tier>, has_watermark=false,
--                                    is_edit_locked=false, edit_expires_at=NULL, paid_at=now()
--   kind='invitation_renewal'     => invitations.expires_at += 90 hari, status='published'
--   kind='business_subscription'  => user_profiles.business_subscription_expires_at = now()+30 hari

-- =====================================================
-- SYSTEM & CONFIG
-- =====================================================

CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit log (for admin actions)
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```

## 3.2 Database Relations Diagram (Text)

```
users ─┬─< accounts (oauth: google)   [dikelola Better Auth]
       ├─< sessions                   [dikelola Better Auth]
       ├─1 user_profiles (free_invitation_used, business_subscription_expires_at)
       ├─< invitations ─┬─< guest_invites ─< rsvp_responses (guest_invite_id, opsional)
       │                ├─< rsvp_responses
       │                ├─< guestbook_messages ─< guestbook_likes
       │                ├─< media_assets
       │                ├─< invitation_views
       │                ├─< invitation_daily_stats
       │                ├─< section_usage
       │                └─< payments (invitation_unlock | invitation_renewal)
       ├─< payments (business_subscription)
       └─< audit_logs

templates ─< invitations (source_template)
section_types ─< section_usage
```

---

# BAGIAN 4: JSON SCHEMA SPECIFICATION

## 4.1 Section Schema (Zod)

```typescript
// lib/sections/schema.ts
import { z } from 'zod'

// =====================================================
// SECTION PROPS SCHEMAS (per section type)
// =====================================================

export const HeroSectionProps = z.object({
  couple_names: z.string().min(1),
  event_date: z.string().datetime(),
  background_image: z.string().url(),
  overlay_opacity: z.number().min(0).max(1).default(0.5),
  tagline: z.string().optional(),
  has_countdown: z.boolean().default(true),
})

export const CoupleIntroProps = z.object({
  bride: z.object({
    name: z.string(),
    full_name: z.string(),
    bio: z.string(),
    photo: z.string().url(),
    instagram: z.string().optional(),
    parents: z.string().optional(),
    child_order: z.string().optional(), // "Putri pertama"
  }),
  groom: z.object({
    name: z.string(),
    full_name: z.string(),
    bio: z.string(),
    photo: z.string().url(),
    instagram: z.string().optional(),
    parents: z.string().optional(),
    child_order: z.string().optional(),
  }),
})

export const EventDetailsProps = z.object({
  events: z.array(z.object({
    name: z.string(), // "Akad Nikah", "Resepsi"
    date: z.string().datetime(),
    start_time: z.string(), // "08:00"
    end_time: z.string().optional(),
    venue_name: z.string(),
    address: z.string(),
    maps_url: z.string().url().optional(),
    dresscode: z.string().optional(),
  })),
})

export const GalleryProps = z.object({
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    caption: z.string().optional(),
  })).min(1),
  layout: z.enum(['masonry', 'grid', 'carousel', 'swipe']).default('masonry'),
  columns: z.number().min(1).max(4).default(3),
  autoplay: z.boolean().default(false),
  autoplay_speed: z.number().default(3000),
})

export const RsvpProps = z.object({
  deadline: z.string().datetime().optional(),
  max_guests_per_person: z.number().default(2),
  require_phone: z.boolean().default(false),
  custom_fields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(['text', 'select', 'textarea']),
    options: z.array(z.string()).optional(),
    required: z.boolean().default(false),
  })).default([]),
})

export const GuestbookProps = z.object({
  require_approval: z.boolean().default(true),
  allow_media: z.boolean().default(false),
  max_message_length: z.number().default(500),
})

export const GiftProps = z.object({
  bank_accounts: z.array(z.object({
    bank_name: z.string(),
    account_number: z.string(),
    account_name: z.string(),
    logo_url: z.string().optional(),
  })),
  digital_wallets: z.array(z.object({
    provider: z.string(), // 'gopay', 'ovo', 'dana', 'shopeepay'
    phone_number: z.string(),
    name: z.string(),
    qr_code_url: z.string().optional(),
  })),
  address: z.string().optional(), // for physical gifts
})

export const CountdownProps = z.object({
  target_date: z.string().datetime(),
  show_days: z.boolean().default(true),
  show_hours: z.boolean().default(true),
  show_minutes: z.boolean().default(true),
  show_seconds: z.boolean().default(true),
  message_expired: z.string().default("Acara telah berakhir"),
})

export const MusicProps = z.object({
  audio_url: z.string().url(),
  autoplay: z.boolean().default(false),
  title: z.string().optional(),
  artist: z.string().optional(),
})

export const QuoteProps = z.object({
  text: z.string(),
  source: z.string().optional(), // "QS. Ar-Rum: 21" or author
  is_arabic: z.boolean().default(false),
  translation: z.string().optional(),
})

export const LivestreamProps = z.object({
  platform: z.enum(['youtube', 'zoom', 'instagram', 'google-meet']),
  url: z.string().url(),
  start_time: z.string().datetime(),
  password: z.string().optional(), // for zoom
})

export const ProtokolHealthProps = z.object({
  message: z.string(),
  items: z.array(z.string()).default([]),
})

// =====================================================
// STYLE OVERRIDES SCHEMA
// =====================================================

export const StyleOverrides = z.object({
  // Colors
  color_primary: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  color_secondary: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  color_text: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  color_background: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  
  // Typography
  font_family: z.string().optional(),
  font_size_title: z.string().optional(), // "48px"
  font_size_body: z.string().optional(),
  font_weight: z.string().optional(),
  
  // Spacing
  padding: z.string().optional(),
  margin: z.string().optional(),
  
  // Layout
  text_align: z.enum(['left', 'center', 'right']).optional(),
  max_width: z.string().optional(),
  
  // Effects
  border_radius: z.string().optional(),
  box_shadow: z.string().optional(),
  background_image: z.string().url().optional(),
  background_opacity: z.number().optional(),
}).partial()

// =====================================================
// SECTION (generic)
// =====================================================

// Map type -> props schema (dipakai untuk validasi per-type)
export const SECTION_PROPS_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'hero': HeroSectionProps,
  'couple-intro': CoupleIntroProps,
  'event-details': EventDetailsProps,
  'gallery': GalleryProps,
  'rsvp': RsvpProps,
  'guestbook': GuestbookProps,
  'gift': GiftProps,
  'countdown': CountdownProps,
  'music': MusicProps,
  'quote': QuoteProps,
  'livestream': LivestreamProps,
  'protokol-health': ProtokolHealthProps,
}

export const SectionSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  variant: z.string(),
  order: z.number().int().min(1),
  visible: z.boolean().default(true),
  props: z.record(z.any()),
  style_overrides: StyleOverrides.optional(),
}).superRefine((section, ctx) => {
  // Validasi props sesuai type. Variant-specific extension (mis. hero video-background
  // yang menambah `video_url`) divalidasi terpisah di registry saat add/switch variant.
  const schema = SECTION_PROPS_SCHEMAS[section.type]
  if (!schema) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown section type: ${section.type}`, path: ['type'] })
    return
  }
  const result = schema.safeParse(section.props)
  if (!result.success) {
    for (const issue of result.error.issues) {
      ctx.addIssue({ ...issue, path: ['props', ...issue.path] })
    }
  }
})

// =====================================================
// FULL INVITATION COMPOSITION
// =====================================================

export const InvitationComposition = z.object({
  template_version: z.string().default('1.0'),
  global_settings: z.object({
    font_family: z.string().default('Inter'),
    color_primary: z.string().default('#D4AF37'),
    color_secondary: z.string().default('#1A1A1A'),
    color_background: z.string().default('#FAFAFA'),
    background_pattern: z.string().optional(),
    animation: z.enum(['none', 'fade', 'slide', 'zoom']).default('fade'),
    music_url: z.string().url().optional(),
    is_rtl: z.boolean().default(false), // for Arabic text
  }),
  sections: z.array(SectionSchema),
})
```

---

# BAGIAN 5: PROJECT STRUCTURE

## 5.1 Next.js Project Layout

```
undangan-platform/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, type-check, test
│       └── deploy.yml                # Deploy to production
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (public)/                 # Public routes (no auth)
│   │   │   ├── page.tsx             # Landing page
│   │   │   ├── templates/
│   │   │   │   └── page.tsx         # Template gallery (browse)
│   │   │   ├── preview/
│   │   │   │   └── [templateId]/
│   │   │   │       └── page.tsx     # Live template preview
│   │   │   ├── [slug]/
│   │   │   │   ├── page.tsx         # ⭐ Public invitation page (dynamic + cacheTag)
│   │   │   │   ├── opengraph-image.tsx
│   │   │   │   └── layout.tsx       # Minimal layout for invitations
│   │   │   ├── login/
│   │   │   │   └── page.tsx         # Hanya tombol "Lanjutkan dengan Google"
│   │   │   └── pricing/
│   │   │       └── page.tsx
│   │   │   # (tidak ada /register — Google OAuth otomatis buat akun)
│   │   │
│   │   ├── (dashboard)/              # Protected routes (auth required)
│   │   │   ├── layout.tsx           # Dashboard layout with sidebar
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx         # Overview (stats, recent invitations)
│   │   │   ├── invitations/
│   │   │   │   ├── page.tsx         # List all user's invitations
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx     # Select template → create
│   │   │   │   └── [invitationId]/
│   │   │   │       ├── page.tsx     # Invitation details (stats, RSVP list)
│   │   │   │       ├── settings/
│   │   │   │       │   └── page.tsx # Domain, expiry, etc
│   │   │   │       ├── rsvp/
│   │   │   │       │   └── page.tsx # RSVP management
│   │   │   │       ├── guests/
│   │   │   │       │   └── page.tsx # Undangan per-tamu (premium): CRUD + generate link WA
│   │   │   │       └── unlock/
│   │   │   │           └── page.tsx # Halaman bayar (trial habis / hilangkan watermark)
│   │   │   ├── builder/
│   │   │   │   └── [invitationId]/
│   │   │   │       ├── page.tsx     # ⭐ Main builder interface
│   │   │   │       └── layout.tsx   # Full-screen layout (no sidebar)
│   │   │   ├── media/
│   │   │   │   └── page.tsx         # Media library
│   │   │   ├── billing/
│   │   │   │   └── page.tsx         # Subscription & payment history
│   │   │   └── settings/
│   │   │       └── page.tsx         # Profile settings
│   │   │
│   │   ├── (admin)/                  # Admin routes
│   │   │   ├── layout.tsx
│   │   │   └── admin/
│   │   │       ├── page.tsx         # Admin dashboard
│   │   │       ├── templates/
│   │   │       │   └── page.tsx     # Manage templates
│   │   │       ├── users/
│   │   │       │   └── page.tsx     # Manage users
│   │   │       └── analytics/
│   │   │           └── page.tsx     # Platform analytics
│   │   │
│   │   ├── api/                      # API Routes (public + internal)
│   │   │   ├── auth/
│   │   │   │   └── [...all]/
│   │   │   │       └── route.ts     # Better Auth handler (toNextJsHandler)
│   │   │   ├── public/
│   │   │   │   └── [slug]/
│   │   │   │       ├── rsvp/
│   │   │   │       │   └── route.ts # POST RSVP (Turnstile + honeypot + rate limit)
│   │   │   │       └── guestbook/
│   │   │   │           └── route.ts # GET (paginated) / POST guestbook
│   │   │   ├── uploads/
│   │   │   │   ├── presign/route.ts # S3 presigned URL
│   │   │   │   └── confirm/route.ts # confirm + enqueue image processing
│   │   │   ├── payments/
│   │   │   │   └── create/route.ts  # buat payment + Snap token
│   │   │   ├── webhooks/
│   │   │   │   └── payment/
│   │   │   │       └── route.ts     # Midtrans webhook (verify signature, idempoten)
│   │   │   └── cron/
│   │   │       ├── aggregate-stats/route.ts   # Daily stats (Vercel Cron)
│   │   │       ├── lock-expired-edits/route.ts # set is_edit_locked utk trial lewat 7 hari
│   │   │       └── archive-expired/route.ts    # status='expired' utk lewat expires_at
│   │   │
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Global styles (Tailwind)
│   ├── middleware.ts                # ⭐ Edge: cek cookie sesi saja (bukan DB)
│   ├── instrumentation.ts           # Sentry init
│   │
│   ├── components/                   # Shared components
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   └── ...
│   │   ├── dashboard/                # Dashboard-specific components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   └── InvitationCard.tsx
│   │   ├── builder/                  # Builder-specific components
│   │   │   ├── Canvas.tsx           # ⭐ Main builder canvas
│   │   │   ├── SectionLibrary.tsx   # Left panel: available sections
│   │   │   ├── PropertyPanel.tsx    # Right panel: edit selected section
│   │   │   ├── VariantSwitcher.tsx  # Switch between variants
│   │   │   ├── StyleEditor.tsx      # Style overrides editor
│   │   │   ├── SortableSection.tsx  # Drag-and-drop wrapper
│   │   │   ├── PreviewFrame.tsx     # Mobile preview iframe
│   │   │   └── Toolbar.tsx          # Top toolbar (save, preview, publish)
│   │   ├── invitation/              # Public invitation components
│   │   │   ├── Cover.tsx            # Opening cover (with "Open Invitation" button)
│   │   │   ├── MusicPlayer.tsx      # Floating music player
│   │   │   ├── CountdownTimer.tsx   # Countdown widget
│   │   │   └── ShareButtons.tsx     # WhatsApp, copy link
│   │   └── common/                   # Shared common components
│   │       ├── Logo.tsx
│   │       ├── Footer.tsx
│   │       └── ...
│   │
│   ├── sections/                     # ⭐ SECTION REGISTRY (invitation sections)
│   │   ├── hero/
│   │   │   ├── variants/
│   │   │   │   ├── FullscreenPhoto.tsx
│   │   │   │   ├── FullscreenPhoto.module.css
│   │   │   │   ├── SplitQuote.tsx
│   │   │   │   ├── SplitQuote.module.css
│   │   │   │   ├── VideoBackground.tsx
│   │   │   │   ├── VideoBackground.module.css
│   │   │   │   └── index.ts
│   │   │   └── index.ts             # Section definition
│   │   ├── couple-intro/
│   │   │   ├── variants/
│   │   │   │   ├── SideBySide.tsx
│   │   │   │   ├── Stacked.tsx
│   │   │   │   ├── Polaroid.tsx
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── event-details/
│   │   │   ├── variants/
│   │   │   │   ├── TimelineList.tsx
│   │   │   │   ├── CardGrid.tsx
│   │   │   │   └── ElegantScroll.tsx
│   │   │   └── index.ts
│   │   ├── countdown/
│   │   │   ├── variants/
│   │   │   │   ├── FlipClock.tsx
│   │   │   │   ├── CircleProgress.tsx
│   │   │   │   └── MinimalNumbers.tsx
│   │   │   └── index.ts
│   │   ├── gallery/
│   │   │   ├── variants/
│   │   │   │   ├── MasonryGrid.tsx
│   │   │   │   ├── Carousel.tsx
│   │   │   │   ├── SwipeStack.tsx
│   │   │   │   └── Lightbox.tsx
│   │   │   └── index.ts
│   │   ├── rsvp/
│   │   │   ├── variants/
│   │   │   │   ├── FormCard.tsx
│   │   │   │   ├── InlineForm.tsx
│   │   │   │   └── ModalTrigger.tsx
│   │   │   └── index.ts
│   │   ├── guestbook/
│   │   │   ├── variants/
│   │   │   │   ├── ChatBubble.tsx
│   │   │   │   ├── CardGrid.tsx
│   │   │   │   └── MarqueeScroll.tsx
│   │   │   └── index.ts
│   │   ├── gift/
│   │   │   ├── variants/
│   │   │   │   ├── CopyToClipboard.tsx
│   │   │   │   ├── QRCodeDisplay.tsx
│   │   │   │   └── ElegantCard.tsx
│   │   │   └── index.ts
│   │   ├── quote/
│   │   │   ├── variants/
│   │   │   │   ├── CenteredSerif.tsx
│   │   │   │   ├── ArabicWithTranslation.tsx
│   │   │   │   └── BackgroundImage.tsx
│   │   │   └── index.ts
│   │   ├── livestream/
│   │   │   ├── variants/
│   │   │   │   ├── EmbeddedPlayer.tsx
│   │   │   │   └── ButtonLink.tsx
│   │   │   └── index.ts
│   │   ├── map-location/
│   │   │   ├── variants/
│   │   │   │   ├── EmbeddedMap.tsx
│   │   │   │   └── StaticImage.tsx
│   │   │   └── index.ts
│   │   ├── thank-you/
│   │   │   ├── variants/
│   │   │   │   ├── SimpleText.tsx
│   │   │   │   └── PhotoWithText.tsx
│   │   │   └── index.ts
│   │   ├── registry.ts              # ⭐ Master registry
│   │   ├── types.ts                 # Shared types
│   │   └── schema.ts                # Zod schemas
│   │
│   ├── templates/                    # Template presets (JSON)
│   │   ├── elegant-gold.json
│   │   ├── rustic-minimal.json
│   │   ├── islamic-classic.json
│   │   ├── modern-bold.json
│   │   ├── vintage-charm.json
│   │   ├── khitan-fun.json
│   │   ├── tahlil-peace.json
│   │   ├── aqiqah-blessing.json
│   │   └── index.ts                 # Template loader
│   │
│   ├── lib/                          # Core libraries & utilities
│   │   ├── db/
│   │   │   ├── schema.ts            # Drizzle schema
│   │   │   ├── index.ts             # DB client
│   │   │   └── migrations/          # Migration files
│   │   ├── auth/
│   │   │   ├── config.ts            # Better Auth config
│   │   │   └── helpers.ts           # Auth utilities
│   │   ├── redis/
│   │   │   ├── index.ts             # Redis client
│   │   │   └── cache.ts             # Cache helpers
│   │   ├── storage/
│   │   │   ├── index.ts             # S3 client
│   │   │   ├── upload.ts            # Upload helpers
│   │   │   └── image-processing.ts  # Sharp/BullMQ processing
│   │   ├── invitation/
│   │   │   ├── renderer.ts          # SectionRenderer logic
│   │   │   ├── migration.ts         # Version migrations
│   │   │   └── slug.ts              # Slug generation
│   │   ├── analytics/
│   │   │   ├── tracker.ts           # View tracking
│   │   │   └── aggregation.ts       # Stats aggregation
│   │   ├── validation/
│   │   │   └── schemas.ts           # API input validation
│   │   ├── rate-limit.ts            # Rate limiting with Redis
│   │   ├── email/
│   │   │   ├── templates/           # Email templates
│   │   │   └── sender.ts            # Send email (Resend)
│   │   └── utils/
│   │       ├── cn.ts                # Class name merge
│   │       ├── date.ts              # Date formatting
│   │       └── slug.ts              # Slug utilities
│   │
│   ├── hooks/                        # React hooks
│   │   ├── use-builder.ts          # Builder state management
│   │   ├── use-autosave.ts         # Auto-save functionality
│   │   ├── use-media-upload.ts     # File upload hook
│   │   └── use-debounce.ts         # Debounce hook
│   │
│   ├── stores/                       # Zustand stores
│   │   ├── builder-store.ts        # ⭐ Builder state (sections, selection, etc)
│   │   ├── auth-store.ts            # Auth state
│   │   └── ui-store.ts              # UI state (modals, toasts)
│   │
│   ├── types/                        # TypeScript type definitions
│   │   ├── invitation.ts
│   │   ├── section.ts
│   │   ├── template.ts
│   │   └── api.ts
│   │
│   ├── config/                       # Configuration
│   │   ├── site.ts                  # Site config (name, domains, etc)
│   │   ├── sections.ts              # Section config (what's available)
│   │   └── plans.ts                 # Pricing plans
│   │
│   └── workers/                      # Background job processors
│       ├── image-processor.ts       # Process uploaded images
│       ├── email-sender.ts          # Send emails from queue
│       └── stats-aggregator.ts      # Aggregate daily stats
│
├── public/
│   ├── fonts/                       # Self-hosted fonts
│   ├── images/                      # Static images
│   └── icons/                       # Icons
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/                         # Playwright tests
│
├── drizzle.config.ts                # Drizzle Kit config
├── next.config.ts                   # Next.js config
├── tailwind.config.ts               # Tailwind config
├── tsconfig.json
├── package.json
├── .env.example
├── .env.local                       # (gitignored)
├── Dockerfile                       # For self-hosting
├── docker-compose.yml               # For local dev with services
└── README.md
```

---

# BAGIAN 6: CORE IMPLEMENTATION CODE

## 6.1 Section Registry (Master)

```typescript
// src/sections/registry.ts
import type { ComponentType } from 'react'
import dynamic from 'next/dynamic'
import { z } from 'zod'
import type { SectionProps, SectionDefinition } from './types'

// Dynamic imports for code-splitting
const HeroFullscreenPhoto = dynamic(() => import('./hero/variants/FullscreenPhoto'), { ssr: true })
const HeroSplitQuote = dynamic(() => import('./hero/variants/SplitQuote'), { ssr: true })
const HeroVideoBg = dynamic(() => import('./hero/variants/VideoBackground'), { ssr: true })

const CoupleSideBySide = dynamic(() => import('./couple-intro/variants/SideBySide'), { ssr: true })
const CoupleStacked = dynamic(() => import('./couple-intro/variants/Stacked'), { ssr: true })
const CouplePolaroid = dynamic(() => import('./couple-intro/variants/Polaroid'), { ssr: true })

const GalleryMasonry = dynamic(() => import('./gallery/variants/MasonryGrid'), { ssr: true })
const GalleryCarousel = dynamic(() => import('./gallery/variants/Carousel'), { ssr: true })
const GallerySwipe = dynamic(() => import('./gallery/variants/SwipeStack'), { ssr: true })

const RsvpFormCard = dynamic(() => import('./rsvp/variants/FormCard'), { ssr: true })
const RsvpInline = dynamic(() => import('./rsvp/variants/InlineForm'), { ssr: true })

const GuestbookChat = dynamic(() => import('./guestbook/variants/ChatBubble'), { ssr: true })
const GuestbookCards = dynamic(() => import('./guestbook/variants/CardGrid'), { ssr: true })

// Next.js 16: `dynamic(..., { ssr: false })` TIDAK diizinkan di Server Component.
// Untuk komponen client-only (countdown pakai window/interval): tandai file-nya
// 'use client' dan import biasa, atau bungkus dalam client wrapper. `ssr: true` default.
const CountdownFlip = dynamic(() => import('./countdown/variants/FlipClock'))
const CountdownCircle = dynamic(() => import('./countdown/variants/CircleProgress'))

// Import Zod schemas
import { HeroSectionProps, CoupleIntroProps, GalleryProps, RsvpProps } from './schema'

// =====================================================
// MASTER REGISTRY
// =====================================================

export const SectionRegistry: Record<string, SectionDefinition> = {
  'hero': {
    type: 'hero',
    name: 'Pembukaan / Hero',
    nameId: 'Pembukaan',
    description: 'Bagian pertama yang dilihat tamu',
    category: 'hero',
    icon: 'Sparkles',
    isPremium: false,
    variants: {
      'fullscreen-photo': {
        name: 'Foto Fullscreen',
        component: HeroFullscreenPhoto,
        previewImage: '/previews/hero/fullscreen-photo.png',
        propsSchema: HeroSectionProps,
        defaultProps: {
          couple_names: 'Your Names',
          event_date: new Date().toISOString(),
          background_image: '/defaults/hero-bg.jpg',
          overlay_opacity: 0.5,
          has_countdown: true,
        },
        styleSchema: [
          { key: 'font_size_title', label: 'Ukuran Judul', type: 'slider', min: 24, max: 96, default: 52 },
          { key: 'text_color', label: 'Warna Teks', type: 'color', default: '#FFFFFF' },
          { key: 'overlay_opacity', label: 'Overlay Gelap', type: 'slider', min: 0, max: 1, step: 0.1, default: 0.5 },
        ],
      },
      'split-quote': {
        name: 'Split + Quote',
        component: HeroSplitQuote,
        previewImage: '/previews/hero/split-quote.png',
        propsSchema: HeroSectionProps,
        defaultProps: {
          couple_names: 'Your Names',
          event_date: new Date().toISOString(),
          tagline: 'We are getting married!',
        },
        styleSchema: [],
      },
      'video-background': {
        name: 'Video Background',
        component: HeroVideoBg,
        previewImage: '/previews/hero/video-bg.png',
        propsSchema: HeroSectionProps.extend({
          video_url: z.string().url(),
        }),
        defaultProps: {
          couple_names: 'Your Names',
          event_date: new Date().toISOString(),
          video_url: '',
        },
        styleSchema: [],
        isPremium: true,
      },
    },
  },
  
  'couple-intro': {
    type: 'couple-intro',
    name: 'Profil Mempelai',
    nameId: 'Profil',
    description: 'Perkenalan mempelai',
    category: 'content',
    icon: 'Users',
    isPremium: false,
    variants: {
      'side-by-side': {
        name: 'Bersebelahan',
        component: CoupleSideBySide,
        previewImage: '/previews/couple/side-by-side.png',
        propsSchema: CoupleIntroProps,
        defaultProps: {
          bride: { name: 'Bride', full_name: '', bio: '', photo: '/defaults/bride.jpg' },
          groom: { name: 'Groom', full_name: '', bio: '', photo: '/defaults/groom.jpg' },
        },
        styleSchema: [
          { key: 'photo_border_radius', label: 'Sudut Foto', type: 'slider', min: 0, max: 100, default: 50 },
          { key: 'photo_size', label: 'Ukuran Foto', type: 'slider', min: 100, max: 300, default: 200 },
        ],
      },
      'stacked': {
        name: 'Bertumpuk',
        component: CoupleStacked,
        previewImage: '/previews/couple/stacked.png',
        propsSchema: CoupleIntroProps,
        defaultProps: {},
        styleSchema: [],
      },
      'polaroid': {
        name: 'Polaroid Style',
        component: CouplePolaroid,
        previewImage: '/previews/couple/polaroid.png',
        propsSchema: CoupleIntroProps,
        defaultProps: {},
        styleSchema: [],
        isPremium: true,
      },
    },
  },
  
  'gallery': {
    type: 'gallery',
    name: 'Galeri Foto',
    nameId: 'Galeri',
    description: 'Kumpulan foto momen',
    category: 'content',
    icon: 'Images',
    isPremium: false,
    variants: {
      'masonry-grid': {
        name: 'Masonry Grid',
        component: GalleryMasonry,
        previewImage: '/previews/gallery/masonry.png',
        propsSchema: GalleryProps,
        defaultProps: {
          images: [{ url: '/defaults/gallery-1.jpg' }],
          columns: 3,
        },
        styleSchema: [
          { key: 'gap', label: 'Jarak Antar Foto', type: 'slider', min: 0, max: 32, default: 8 },
          { key: 'border_radius', label: 'Sudut Gambar', type: 'slider', min: 0, max: 24, default: 8 },
        ],
      },
      'carousel': {
        name: 'Carousel / Slider',
        component: GalleryCarousel,
        previewImage: '/previews/gallery/carousel.png',
        propsSchema: GalleryProps,
        defaultProps: {
          images: [{ url: '/defaults/gallery-1.jpg' }],
          autoplay: true,
          autoplay_speed: 3000,
        },
        styleSchema: [],
      },
      'swipe-stack': {
        name: 'Swipe Stack',
        component: GallerySwipe,
        previewImage: '/previews/gallery/swipe.png',
        propsSchema: GalleryProps,
        defaultProps: {},
        styleSchema: [],
        isPremium: true,
      },
    },
  },
  
  'rsvp': {
    type: 'rsvp',
    name: 'RSVP',
    nameId: 'RSVP',
    description: 'Konfirmasi kehadiran tamu',
    category: 'interactive',
    icon: 'CheckCircle',
    isPremium: false,
    variants: {
      'form-card': {
        name: 'Form Card',
        component: RsvpFormCard,
        previewImage: '/previews/rsvp/form-card.png',
        propsSchema: RsvpProps,
        defaultProps: {
          max_guests_per_person: 2,
          require_phone: false,
        },
        styleSchema: [],
      },
      'inline-form': {
        name: 'Inline Form',
        component: RsvpInline,
        previewImage: '/previews/rsvp/inline.png',
        propsSchema: RsvpProps,
        defaultProps: {},
        styleSchema: [],
      },
    },
  },
  
  'guestbook': {
    type: 'guestbook',
    name: 'Buku Tamu / Ucapan',
    nameId: 'Ucapan',
    description: 'Ucapan dan doa dari tamu',
    category: 'interactive',
    icon: 'MessageCircle',
    isPremium: false,
    variants: {
      'chat-bubble': {
        name: 'Chat Bubble',
        component: GuestbookChat,
        previewImage: '/previews/guestbook/chat.png',
        propsSchema: z.object({ require_approval: z.boolean().default(true) }),
        defaultProps: {},
        styleSchema: [],
      },
      'card-grid': {
        name: 'Card Grid',
        component: GuestbookCards,
        previewImage: '/previews/guestbook/cards.png',
        propsSchema: z.object({}),
        defaultProps: {},
        styleSchema: [],
      },
    },
  },
  
  'countdown': {
    type: 'countdown',
    name: 'Countdown Timer',
    nameId: 'Countdown',
    description: 'Hitung mundur menuju hari-H',
    category: 'interactive',
    icon: 'Timer',
    isPremium: false,
    variants: {
      'flip-clock': {
        name: 'Flip Clock',
        component: CountdownFlip,
        previewImage: '/previews/countdown/flip.png',
        propsSchema: z.object({ target_date: z.string() }),
        defaultProps: {},
        styleSchema: [],
      },
      'circle-progress': {
        name: 'Circle Progress',
        component: CountdownCircle,
        previewImage: '/previews/countdown/circle.png',
        propsSchema: z.object({ target_date: z.string() }),
        defaultProps: {},
        styleSchema: [],
      },
    },
  },
  
  // ... register semua section types lainnya
}

// Helper functions
export function getSectionDefinition(type: string): SectionDefinition | undefined {
  return SectionRegistry[type]
}

export function getVariantComponent(type: string, variant: string): ComponentType<SectionProps> | undefined {
  return SectionRegistry[type]?.variants[variant]?.component
}

export function getAllSectionTypes(): SectionDefinition[] {
  return Object.values(SectionRegistry)
}

export function getSectionsByCategory(category: string): SectionDefinition[] {
  return Object.values(SectionRegistry).filter(s => s.category === category)
}
```

## 6.2 Section Renderer

```typescript
// src/lib/invitation/renderer.tsx
import { getVariantComponent } from '@/sections/registry'
import type { SectionData } from '@/sections/types'
import type { GlobalSettings } from '@/sections/types'

interface SectionRendererProps {
  section: SectionData
  globalSettings: GlobalSettings
  invitationId?: string
  isPreview?: boolean
}

export function SectionRenderer({
  section,
  globalSettings,
  invitationId,
  isPreview = false,
}: SectionRendererProps) {
  if (!section.visible) return null

  const Component = getVariantComponent(section.type, section.variant)
  
  if (!Component) {
    console.warn(`Unknown section: ${section.type}/${section.variant}`)
    return null
  }

  return (
    <section
      id={section.id}
      data-section-type={section.type}
      data-section-variant={section.variant}
      style={section.style_overrides as React.CSSProperties}
    >
      <Component
        {...section.props}
        globalSettings={globalSettings}
        invitationId={invitationId}
        isPreview={isPreview}
      />
    </section>
  )
}

// Full invitation renderer
interface InvitationRendererProps {
  composition: {
    template_version: string
    global_settings: GlobalSettings
    sections: SectionData[]
  }
  invitationId: string
  isPreview?: boolean
}

export function InvitationRenderer({
  composition,
  invitationId,
  isPreview = false,
}: InvitationRendererProps) {
  const { global_settings, sections } = composition

  const sortedSections = [...sections].sort((a, b) => a.order - b.order)

  return (
    <div 
      className="invitation-root"
      data-theme={global_settings.theme || 'default'}
      style={{
        '--color-primary': global_settings.color_primary,
        '--color-secondary': global_settings.color_secondary,
        '--color-background': global_settings.color_background,
        '--font-family': global_settings.font_family,
      } as React.CSSProperties}
    >
      {sortedSections.map(section => (
        <SectionRenderer
          key={section.id}
          section={section}
          globalSettings={global_settings}
          invitationId={invitationId}
          isPreview={isPreview}
        />
      ))}
    </div>
  )
}
```

## 6.3 Public Invitation Page (ISR)

```typescript
// src/app/(public)/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { unstable_cacheTag as cacheTag, unstable_cacheLife as cacheLife } from 'next/cache'
import { db } from '@/lib/db'
import { invitations, rsvp_responses, guestbook_messages } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { InvitationRenderer } from '@/lib/invitation/renderer'
import { migrateComposition } from '@/lib/invitation/migration'
import type { Metadata } from 'next'

// Next.js 16 Cache Components: halaman dinamis, data undangan di-cache & di-tag.
// Revalidasi ON-DEMAND lewat revalidateTag(`invitation:${id}`) saat publish/edit,
// dan `guestbook:${id}` saat ucapan baru di-approve. TIDAK ada pre-render massal.
export const dynamicParams = true
export function generateStaticParams() { return [] }

// Generate metadata untuk SEO & WhatsApp preview
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const invitation = await getInvitationBySlug(slug)
  
  if (!invitation) return { title: 'Undangan tidak ditemukan' }

  const { global_settings, sections } = invitation.sections
  const heroSection = sections.find(s => s.type === 'hero')
  
  return {
    title: invitation.event_title || `${heroSection?.props?.couple_names}`,
    description: `Undangan ${invitation.event_type} - ${new Date(invitation.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    openGraph: {
      title: invitation.event_title,
      description: 'Kami mengundang Anda untuk hadir di acara spesial kami',
      images: [heroSection?.props?.background_image || '/defaults/og-image.jpg'],
      type: 'website',
    },
  }
}

async function getInvitationBySlug(slug: string) {
  'use cache'
  cacheTag(`invitation:slug:${slug}`)
  cacheLife('days') // aman: invalidasi selalu on-demand via revalidateTag saat edit/publish

  const result = await db
    .select()
    .from(invitations)
    .where(eq(invitations.slug, slug))
    .limit(1)
  
  if (!result[0]) return null
  cacheTag(`invitation:${result[0].id}`)
  
  // Run migrations if needed
  const migrated = migrateComposition({
    template_version: result[0].template_version,
    global_settings: result[0].global_settings,
    sections: result[0].sections,
  })
  
  return {
    ...result[0],
    ...migrated,
  }
}

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const invitation = await getInvitationBySlug(slug)

  if (!invitation || invitation.status !== 'published') {
    notFound()
  }

  // Fetch RSVP and guestbook data for initial render
  const [rsvpData, guestbookData] = await Promise.all([
    db
      .select()
      .from(rsvp_responses)
      .where(eq(rsvp_responses.invitation_id, invitation.id))
      .orderBy(desc(rsvp_responses.created_at))
      .limit(50),
    db
      .select()
      .from(guestbook_messages)
      .where(and(
        eq(guestbook_messages.invitation_id, invitation.id),
        eq(guestbook_messages.status, 'approved')
      ))
      .orderBy(desc(guestbook_messages.created_at))
      .limit(50),
  ])

  // Track view — Next.js 16: headers() async; jalankan setelah response via after()
  const headersList = await headers()
  const xff = headersList.get('x-forwarded-for') ?? ''
  const clientIp = xff.split(',')[0].trim() || null
  after(() =>
    trackView(invitation.id, {
      ip: clientIp,
      userAgent: headersList.get('user-agent'),
      referrer: headersList.get('referer'),
    }).catch(console.error)
  )

  return (
    <>
      {/* Cover / Opening */}
      <InvitationCover invitation={invitation} />
      
      {/* Main Content */}
      <InvitationRenderer
        composition={{
          template_version: invitation.template_version,
          global_settings: invitation.global_settings,
          sections: invitation.sections,
        }}
        invitationId={invitation.id}
      />
      
      {/* Music Player (if configured) */}
      {invitation.global_settings.music_url && (
        <MusicPlayer audioUrl={invitation.global_settings.music_url} />
      )}
    </>
  )
}
```

### Personalisasi tamu (`?to=<token>`)

`page.tsx` menerima `searchParams: Promise<{ to?: string }>` (async di Next 16). Bila `to` ada:
lookup `guest_invites` by `slug_token` → render cover "Kepada Yth. {guest_name}", prefill nama di form RSVP,
set `opened_at` sekali via `after()`. Token tidak valid → fallback ke cover generik (jangan 404).
Lookup guest di-cache dengan `cacheTag('invitation:' + id)` juga supaya ikut ter-invalidate.

## 6.4 Middleware (Edge — cookie check saja)

```typescript
// src/middleware.ts  — Edge runtime: TIDAK boleh query DB / import drizzle / ioredis
import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies' // baca cookie, tanpa DB

// Allowed domains for invitations
const INVITATION_DOMAINS = [
  'undangan.com',
  'invitation.com',
  'ngaturi.com',
  'localhost:3000', // for dev
]

// Paths that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/builder',
  '/media',
  '/billing',
  '/settings',
]

// Paths that are admin-only
const ADMIN_PATHS = [
  '/admin',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host')?.split(':')[0] || ''
  
  // =====================================================
  // 1. AUTH GUARD (dangkal) — hanya cek keberadaan cookie sesi.
  //    Verifikasi sesi sungguhan + cek role dilakukan di:
  //      - (dashboard)/layout.tsx  -> auth.api.getSession({ headers })
  //      - (admin)/layout.tsx      -> getSession + assert role === 'admin'
  //    Middleware Edge tidak bisa akses DB, jadi jangan andalkan ini untuk otorisasi.
  // =====================================================
  if ([...PROTECTED_PATHS, ...ADMIN_PATHS].some(path => pathname.startsWith(path))) {
    const hasSession = getSessionCookie(request)
    if (!hasSession) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // =====================================================
  // 2. DOMAIN ROUTING for invitation pages
  // =====================================================
  // Check if this is an invitation domain and the path looks like a slug
  const isInvitationDomain = INVITATION_DOMAINS.includes(host)
  const isRootPath = pathname === '/'
  const isSlugPath = /^\/[a-z0-9-]+$/.test(pathname)
  
  if (isInvitationDomain && isRootPath) {
    // Redirect root of invitation domains to main site
    return NextResponse.redirect('https://main-platform.com')
  }
  
  // Note: Actual invitation rendering is handled by [slug] route
  // Middleware only ensures the request reaches the right handler

  // =====================================================
  // 3. RATE LIMITING (basic, for API routes)
  // =====================================================
  if (pathname.startsWith('/api/')) {
    // Rate limit check with Redis (implement in lib/rate-limit)
    // const isAllowed = await checkRateLimit(request)
    // if (!isAllowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
}
```

## 6.5 Builder State (Zustand Store)

```typescript
// src/stores/builder-store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { SectionData, GlobalSettings } from '@/sections/types'

interface BuilderState {
  // Current invitation
  invitationId: string | null
  sections: SectionData[]
  globalSettings: GlobalSettings
  templateVersion: string
  
  // Editor state
  selectedSectionId: string | null
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: Date | null
  isPreviewMode: boolean
  previewDevice: 'mobile' | 'tablet' | 'desktop'
  
  // History (undo/redo)
  history: SectionData[][]
  historyIndex: number
  
  // Actions
  loadInvitation: (data: {
    invitationId: string
    sections: SectionData[]
    globalSettings: GlobalSettings
    templateVersion: string
  }) => void
  
  addSection: (type: string, variant: string, position?: number) => void
  removeSection: (sectionId: string) => void
  reorderSection: (sectionId: string, newPosition: number) => void
  duplicateSection: (sectionId: string) => void
  
  updateSectionProps: (sectionId: string, props: Partial<SectionData['props']>) => void
  updateSectionVariant: (sectionId: string, newVariant: string) => void
  updateSectionStyle: (sectionId: string, styleKey: string, styleValue: any) => void
  toggleSectionVisibility: (sectionId: string) => void
  
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void
  
  // Editor actions
  selectSection: (sectionId: string | null) => void
  setPreviewMode: (isPreview: boolean) => void
  setPreviewDevice: (device: 'mobile' | 'tablet' | 'desktop') => void
  
  // Save
  markAsDirty: () => void
  markAsSaved: () => void
  setSaving: (isSaving: boolean) => void
  
  // History
  undo: () => void
  redo: () => void
  pushToHistory: () => void
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
      // Initial state
      invitationId: null,
      sections: [],
      globalSettings: {
        font_family: 'Inter',
        color_primary: '#D4AF37',
        color_secondary: '#1A1A1A',
        color_background: '#FAFAFA',
      },
      templateVersion: '1.0',
      selectedSectionId: null,
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      isPreviewMode: false,
      previewDevice: 'mobile',
      history: [],
      historyIndex: -1,

      // Load invitation data
      loadInvitation: (data) => set({
        invitationId: data.invitationId,
        sections: data.sections,
        globalSettings: data.globalSettings,
        templateVersion: data.templateVersion,
        isDirty: false,
        history: [data.sections],
        historyIndex: 0,
      }),

      // Add new section
      addSection: (type, variant, position) => {
        const state = get()
        const { SectionRegistry } = require('@/sections/registry')
        const definition = SectionRegistry[type]
        if (!definition) return
        
        const variantDef = definition.variants[variant]
        if (!variantDef) return

        const newSection: SectionData = {
          id: crypto.randomUUID(),
          type,
          variant,
          order: position ?? state.sections.length + 1,
          visible: true,
          props: { ...variantDef.defaultProps },
          style_overrides: {},
        }

        const newSections = position !== undefined
          ? [
              ...state.sections.slice(0, position),
              newSection,
              ...state.sections.slice(position),
            ].map((s, i) => ({ ...s, order: i + 1 }))
          : [...state.sections, newSection]

        set({ sections: newSections, isDirty: true, selectedSectionId: newSection.id })
        get().pushToHistory()
      },

      // Remove section
      removeSection: (sectionId) => {
        const state = get()
        const newSections = state.sections
          .filter(s => s.id !== sectionId)
          .map((s, i) => ({ ...s, order: i + 1 }))
        
        set({
          sections: newSections,
          isDirty: true,
          selectedSectionId: state.selectedSectionId === sectionId ? null : state.selectedSectionId,
        })
        get().pushToHistory()
      },

      // Reorder (for drag-and-drop)
      reorderSection: (sectionId, newPosition) => {
        const state = get()
        const sectionIndex = state.sections.findIndex(s => s.id === sectionId)
        if (sectionIndex === -1) return

        const newSections = [...state.sections]
        const [movedSection] = newSections.splice(sectionIndex, 1)
        newSections.splice(newPosition, 0, movedSection)
        
        // Re-order all
        const reordered = newSections.map((s, i) => ({ ...s, order: i + 1 }))
        
        set({ sections: reordered, isDirty: true })
        get().pushToHistory()
      },

      // Duplicate section
      duplicateSection: (sectionId) => {
        const state = get()
        const section = state.sections.find(s => s.id === sectionId)
        if (!section) return

        const duplicate: SectionData = {
          ...section,
          id: crypto.randomUUID(),
          order: section.order + 1,
        }

        const newSections = [...state.sections]
        newSections.splice(section.order, 0, duplicate)
        const reordered = newSections.map((s, i) => ({ ...s, order: i + 1 }))

        set({ sections: reordered, isDirty: true })
        get().pushToHistory()
      },

      // Update section props
      updateSectionProps: (sectionId, props) => {
        const state = get()
        const newSections = state.sections.map(s =>
          s.id === sectionId
            ? { ...s, props: { ...s.props, ...props } }
            : s
        )
        set({ sections: newSections, isDirty: true })
      },

      // Change variant (with prop migration)
      updateSectionVariant: (sectionId, newVariant) => {
        const state = get()
        const { SectionRegistry } = require('@/sections/registry')
        
        const newSections = state.sections.map(s => {
          if (s.id !== sectionId) return s
          
          const definition = SectionRegistry[s.type]
          const newVariantDef = definition?.variants[newVariant]
          if (!newVariantDef) return s

          // Merge current props with new variant defaults
          // (keep common props, add new defaults, remove obsolete)
          const commonKeys = Object.keys(s.props).filter(key =>
            key in newVariantDef.defaultProps
          )
          
          const migratedProps: Record<string, any> = {}
          commonKeys.forEach(key => {
            migratedProps[key] = s.props[key]
          })
          // Add missing defaults
          Object.entries(newVariantDef.defaultProps).forEach(([key, value]) => {
            if (!(key in migratedProps)) {
              migratedProps[key] = value
            }
          })

          return { ...s, variant: newVariant, props: migratedProps }
        })

        set({ sections: newSections, isDirty: true })
        get().pushToHistory()
      },

      // Update style override
      updateSectionStyle: (sectionId, styleKey, styleValue) => {
        const state = get()
        const newSections = state.sections.map(s =>
          s.id === sectionId
            ? {
                ...s,
                style_overrides: {
                  ...s.style_overrides,
                  [styleKey]: styleValue,
                },
              }
            : s
        )
        set({ sections: newSections, isDirty: true })
      },

      // Toggle visibility
      toggleSectionVisibility: (sectionId) => {
        const state = get()
        const newSections = state.sections.map(s =>
          s.id === sectionId ? { ...s, visible: !s.visible } : s
        )
        set({ sections: newSections, isDirty: true })
      },

      // Global settings
      updateGlobalSettings: (settings) => {
        const state = get()
        set({
          globalSettings: { ...state.globalSettings, ...settings },
          isDirty: true,
        })
      },

      // Editor actions
      selectSection: (sectionId) => set({ selectedSectionId: sectionId }),
      setPreviewMode: (isPreview) => set({ isPreviewMode: isPreview }),
      setPreviewDevice: (previewDevice) => set({ previewDevice }),

      // Save state
      markAsDirty: () => set({ isDirty: true }),
      markAsSaved: () => set({ isDirty: false, lastSavedAt: new Date() }),
      setSaving: (isSaving) => set({ isSaving }),

      // History management
      pushToHistory: () => {
        const state = get()
        const newHistory = state.history.slice(0, state.historyIndex + 1)
        newHistory.push(state.sections)
        
        // Keep max 50 undo steps
        if (newHistory.length > 50) newHistory.shift()
        
        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        })
      },

      undo: () => {
        const state = get()
        if (state.historyIndex <= 0) return
        
        const prevIndex = state.historyIndex - 1
        const prevSections = state.history[prevIndex]
        
        set({ sections: prevSections, historyIndex: prevIndex })
      },

      redo: () => {
        const state = get()
        if (state.historyIndex >= state.history.length - 1) return
        
        const nextIndex = state.historyIndex + 1
        const nextSections = state.history[nextIndex]
        
        set({ sections: nextSections, historyIndex: nextIndex })
      },
    }),
    {
      name: 'builder-draft',
      storage: createJSONStorage(() => localStorage),
      // DRAFT-ONLY: localStorage cuma buffer edit yang belum ke-save (crash recovery).
      // Server (`invitations.updated_at`) adalah source of truth. Saat load builder:
      //   1. selalu fetch dari server;
      //   2. kalau ada draft lokal utk invitationId yang sama DAN draft.savedAt > server.updated_at
      //      -> tawarkan "Pulihkan perubahan belum tersimpan?";
      //   3. selain itu -> buang draft lokal, pakai data server.
      partialize: (state) => ({
        invitationId: state.invitationId,
        sections: state.sections,
        globalSettings: state.globalSettings,
        savedAt: state.lastSavedAt,
      }),
    }
  )
)

// CATATAN GATING: sebelum mengizinkan mutasi (addSection/updateSectionProps/dst),
// builder page harus cek `invitation.is_edit_locked`. Jika true -> render builder
// read-only + banner "Masa edit gratis habis. Unlock mulai Rp 49k" -> /invitations/[id]/unlock.
// Server action `saveInvitation` juga WAJIB menolak (403) bila is_edit_locked.
```

## 6.6 RSVP API Route

```typescript
// src/app/api/public/[slug]/rsvp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rsvp_responses, invitations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/security/turnstile'
import { auth } from '@/lib/auth/config'

// Input validation
const RsvpInputSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().optional(),
  phone: z.string().regex(/^(\+62|62|0)8[1-9][0-9]{6,11}$/).optional(),
  status: z.enum(['attending', 'not_attending', 'maybe']),
  guest_count: z.number().int().min(1).max(10),
  message: z.string().max(500).optional(),
  dietary_restrictions: z.string().max(255).optional(),
  guest_invite_token: z.string().max(40).optional(),
  turnstile_token: z.string().min(1),
  _hp: z.string().max(0).optional(), // honeypot: harus kosong
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()

    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'

    // Validate input (termasuk honeypot & keberadaan turnstile token)
    const validationResult = RsvpInputSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }
    const { data } = validationResult

    // Anti-spam: rate limit (3/menit, 10/jam) + Cloudflare Turnstile
    const [okMinute, okHour] = await Promise.all([
      rateLimit(`rsvp:m:${ip}`, 3, 60),
      rateLimit(`rsvp:h:${ip}`, 10, 3600),
    ])
    if (!okMinute || !okHour) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, { status: 429 })
    }
    if (!(await verifyTurnstile(data.turnstile_token, ip))) {
      return NextResponse.json({ error: 'Verifikasi gagal. Muat ulang halaman.' }, { status: 400 })
    }

    // Find invitation
    const invitation = await db
      .select()
      .from(invitations)
      .where(eq(invitations.slug, slug))
      .limit(1)

    if (!invitation[0] || invitation[0].status !== 'published') {
      return NextResponse.json(
        { error: 'Undangan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if RSVP deadline has passed
    const rsvpSection = invitation[0].sections.find(
      (s: any) => s.type === 'rsvp'
    )
    if (rsvpSection?.props?.deadline) {
      const deadline = new Date(rsvpSection.props.deadline)
      if (new Date() > deadline) {
        return NextResponse.json(
          { error: 'Batas waktu RSVP telah berakhir' },
          { status: 400 }
        )
      }
    }

    // Check for duplicate (same email or phone)
    if (data.email || data.phone) {
      const existing = await db
        .select()
        .from(rsvp_responses)
        .where(and(
          eq(rsvp_responses.invitation_id, invitation[0].id),
          data.email ? eq(rsvp_responses.email, data.email) : eq(rsvp_responses.phone, data.phone!)
        ))
        .limit(1)

      if (existing[0]) {
        return NextResponse.json(
          { error: 'Anda sudah mengisi RSVP sebelumnya' },
          { status: 409 }
        )
      }
    }

    // Insert RSVP
    const newRsvp = await db
      .insert(rsvp_responses)
      .values({
        invitation_id: invitation[0].id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: data.status,
        guest_count: data.guest_count,
        message: data.message,
        dietary_restrictions: data.dietary_restrictions,
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || '',
      })
      .returning()

    // Invalidate cache tag undangan (RSVP count di halaman ikut ter-update)
    revalidateTag(`invitation:${invitation[0].id}`)

    return NextResponse.json({
      success: true,
      data: {
        id: newRsvp[0].id,
        name: newRsvp[0].name,
        status: newRsvp[0].status,
        guest_count: newRsvp[0].guest_count,
      },
      message: 'Terima kasih! RSVP Anda telah tercatat.',
    }, { status: 201 })

  } catch (error) {
    console.error('RSVP error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}

// GET: Fetch RSVP list (for invitation owner)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Only invitation owner can fetch RSVP list
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const invitation = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.slug, slug), eq(invitations.user_id, session.user.id)))
    .limit(1)

  if (!invitation[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const rsvps = await db
    .select()
    .from(rsvp_responses)
    .where(eq(rsvp_responses.invitation_id, invitation[0].id))
    .orderBy(rsvp_responses.created_at)

  return NextResponse.json({ data: rsvps })
}
```

---

# BAGIAN 7: BUSINESS FLOW

## 7.1 User Journey Flow

> **Perubahan v1.1 pada flow di bawah:**
> - Node "REGISTER / LOGIN" → **hanya "Login dengan Google"** (OAuth). Akun dibuat otomatis; tidak ada form register.
> - Setelah login pertama: user diberi entitlement **1 undangan free_trial**, `edit_expires_at = now + 7 hari`.
> - Node "PUBLISH CHECK": free_trial **boleh publish** (dengan watermark + maks 5 foto). Tidak dipaksa bayar saat publish.
> - Builder jadi **read-only** ketika: (a) 7 hari lewat, atau (b) user klik "Hilangkan watermark / tambah foto / undangan per-tamu". Saat itu → node "UPGRADE (Payment)".
> - "UPGRADE" = **one-time payment per undangan** (Basic Rp 49k / Premium Rp 99k), bukan langganan.

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER JOURNEY FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐                                                    │
│  │  VISIT    │ User kunjungi platform                            │
│  │  LANDING  │                                                    │
│  └────┬─────┘                                                    │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────┐    Ya    ┌──────────┐                              │
│  │ Pernah    │────────▶│  LOGIN   │                              │
│  │ pakai?    │         └────┬─────┘                              │
│  └────┬─────┘              │                                    │
│       │ Tidak              │                                    │
│       ▼                    │                                    │
│  ┌──────────┐              │                                    │
│  │ REGISTER │              │                                    │
│  │ / LOGIN  │              │                                    │
│  └────┬─────┘              │                                    │
│       │                    │                                    │
│       ▼                    │                                    │
│  ┌─────────────────────────────────────────────┐                │
│  │  DASHBOARD                                   │                │
│  │  • Lihat undangan yang sudah dibuat          │                │
│  │  • Stats overview                            │                │
│  │  • Tombol "Buat Undangan Baru"               │                │
│  └────┬────────────────────────────────────────┘                │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────┐                │
│  │  TEMPLATE GALLERY                            │                │
│  │  • Filter by category (wedding, khitan, dll)│                │
│  │  • Browse templates                           │                │
│  │  • Preview live                               │                │
│  └────┬────────────────────────────────────────┘                │
│       │                                                          │
│       ▼ User pilih template                                      │
│  ┌─────────────────────────────────────────────┐                │
│  │  TEMPLATE PREVIEW (Live)                     │                │
│  │  • Lihat hasil jadi                           │                │
│  │  • Lihat semua sections                       │                │
│  │  • Tombol "Gunakan Template Ini"              │                │
│  └────┬────────────────────────────────────────┘                │
│       │                                                          │
│       ▼ Klik "Gunakan Template Ini"                              │
│  ┌─────────────────────────────────────────────┐                │
│  │  CREATE INVITATION                            │                │
│  │  • Input slug (URL)                           │                │
│  │  • Pilih domain                               │                │
│  │  • Template composition di-clone              │                │
│  └────┬────────────────────────────────────────┘                │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────┐                │
│  │  BUILDER (Editor)                             │                │
│  │  • Edit content (nama, tanggal, foto)        │                │
│  │  • Ganti section variant                      │                │
│  │  • Add/remove/reorder sections               │                │
│  │  • Adjust style (colors, fonts)              │                │
│  │  • Real-time preview                          │                │
│  │  • Auto-save                                  │                │
│  └────┬────────────────────────────────────────┘                │
│       │                                                          │
│       ▼ Klik "Publish"                                           │
│  ┌─────────────────────────────────────────────┐                │
│  │  PUBLISH CHECK                                │                │
│  │  • Validate all required fields               │                │
│  │  • Check plan limits (photos, sections, etc) │                │
│  │  • If free: show upgrade prompt               │                │
│  └────┬────────────────────────────────────────┘                │
│       │                                                          │
│       ├─── Free Plan ───▶ ┌──────────────┐                       │
│       │                   │  UPGRADE      │                       │
│       │                   │  (Payment)    │                       │
│       │                   └──────┬───────┘                       │
│       │                          │ Success                       │
│       │                          ▼                               │
│       │                   ┌──────────────┐                       │
│       ▼                   ▼              │                       │
│  ┌──────────────────────────────────┐   │                       │
│  │  PUBLISHED!                       │   │                       │
│  │  • Link: undangan.com/tiara-patrik│   │                       │
│  │  • Share: WhatsApp, Copy, QR     │   │                       │
│  │  • Preview live                  │   │                       │
│  └────┬─────────────────────────────┘   │                       │
│       │                                  │                       │
│       ▼                                  │                       │
│  ┌──────────────────────────────────┐    │                       │
│  │  SHARE & DISTRIBUTE               │    │                       │
│  │  • Share via WhatsApp             │    │                       │
│  │  • Copy link                      │    │                       │
│  │  • Download QR code               │    │                       │
│  │  • Embed di Instagram bio         │    │                       │
│  └────┬─────────────────────────────┘    │                       │
│       │                                  │                       │
│       ▼                                  │                       │
│  ┌──────────────────────────────────┐    │                       │
│  │  GUESTS VISIT & INTERACT          │    │                       │
│  │  • View invitation               │    │                       │
│  │  • RSVP (attending/not)          │    │                       │
│  │  • Write guestbook message       │    │                       │
│  │  • View gallery                  │    │                       │
│  │  • Get directions (maps)         │    │                       │
│  └────┬─────────────────────────────┘    │                       │
│       │                                  │                       │
│       ▼                                  │                       │
│  ┌──────────────────────────────────┐    │                       │
│  │  OWNER MONITORS                   │    │                       │
│  │  • View RSVP list                │    │                       │
│  │  • Moderate guestbook            │    │                       │
│  │  • Check analytics               │    │                       │
│  │  • Export guest list             │    │                       │
│  └────┬─────────────────────────────┘    │                       │
│       │                                  │                       │
│       ▼                                  │                       │
│  ┌──────────────────────────────────┐    │                       │
│  │  EVENT DAY & AFTER                │    │                       │
│  │  • Check-in guests               │    │                       │
│  │  • Auto-archive after 30 days    │    │                       │
│  │  • Download memories (photos)    │    │                       │
│  └──────────────────────────────────┘    │                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 7.2 Payment Flow

```
┌─────────────────────────────────────────────────┐
│              PAYMENT FLOW (Midtrans)             │
├─────────────────────────────────────────────────┤
│                                                 │
│  User clicks "Upgrade to Premium"              │
│       │                                         │
│       ▼                                         │
│  Select plan (Basic/Premium/Business)          │
│       │                                         │
│       ▼                                         │
│  Create payment record in DB                   │
│  (status: 'pending')                           │
│       │                                         │
│       ▼                                         │
│  Generate Midtrans Snap Token                  │
│       │                                         │
│       ▼                                         │
│  Show payment page (Midtrans Snap)             │
│  [VA Transfer / QRIS / E-wallet / Card]        │
│       │                                         │
│       ▼                                         │
│  User completes payment                        │
│       │                                         │
│       ▼                                         │
│  Midtrans sends webhook to:                    │
│  /api/webhooks/payment                         │
│       │                                         │
│       ▼                                         │
│  Verify webhook signature                      │
│       │                                         │
│       ▼                                         │
│  Verify signature_key (sha512), idempoten     │
│  by provider_order_id                          │
│  Update payment status → 'paid'                │
│  kind=invitation_unlock:                       │
│    invitations.is_paid=true, plan=<tier>,      │
│    has_watermark=false, is_edit_locked=false,  │
│    edit_expires_at=NULL                        │
│  kind=invitation_renewal: expires_at += 90d    │
│  kind=business_subscription: profile +30d      │
│       │                                         │
│       ▼                                         │
│  Send confirmation email                       │
│       │                                         │
│       ▼                                         │
│  Redirect user to success page                 │
│  + Unlock premium features                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

# BAGIAN 8: UX FLOW (Detailed Wireframes)

## 8.1 Builder Interface (3-Panel Layout)

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo]  Builder: "Tiara & Patrik"  [Undo] [Redo] [Preview] [Save] [Publish] │
├────────────┬────────────────────────────────────────┬───────────────┤
│            │                                        │               │
│  SECTIONS  │         CANVAS (Preview)               │  PROPERTIES   │
│            │                                        │               │
│  ┌──────┐  │  ┌──────────────────────────────┐     │  Section:     │
│  │ [+]  │  │  │                              │     │  Gallery      │
│  │ Add  │  │  │  ┌──────────────────────┐    │     │               │
│  │      │  │  │  │  HERO SECTION        │    │     │  Variant:     │
│  └──────┘  │  │  │  "Tiara & Patrik"    │    │     │  ┌─────────┐ │
│            │  │  │  [Foto Fullscreen]   │    │     │  │ Masonry │ │
│  Active:   │  │  └──────────────────────┘    │     │  │ Carousel│ │
│            │  │                              │     │  │ Swipe   │ │
│  ● Hero    │  │  ┌──────────────────────┐    │     │  └─────────┘ │
│    Intro   │  │  │  COUPLE INTRO        │    │     │               │
│    Gallery │  │  │  [Side-by-Side]      │    │     │  Content:     │
│    RSVP    │  │  └──────────────────────┘    │     │  ┌─────────┐ │
│    Guest   │  │                              │     │  │+ Add    │ │
│            │  │  ┌──────────────────────┐    │     │  │  Photo  │ │
│  Drag to   │  │  │  GALLERY (selected)  │◀───│     │  ├─────────┤ │
│  reorder   │  │  │  [Masonry Grid]      │    │     │  │ Photo 1 │ │
│            │  │  │  ┌──┐┌──┐┌──┐      │    │     │  │ Photo 2 │ │
│  Click to  │  │  │  │  ││  ││  │      │    │     │  │ Photo 3 │ │
│  select    │  │  │  └──┘└──┘└──┘      │    │     │  └─────────┘ │
│            │  │  └──────────────────────┘    │     │               │
│            │  │                              │     │  Style:       │
│  [Delete]  │  │  ┌──────────────────────┐    │     │  Gap: [██░░] │
│  [Hide]    │  │  │  RSVP FORM           │    │     │  Radius:[█░░]│
│  [Move ↑↓] │  │  │  [Form Card]         │    │     │               │
│            │  │  └──────────────────────┘    │     │  [Delete]    │
│            │  │                              │     │  [Hide]      │
│            │  │  ┌──────────────────────┐    │     │  [Duplicate] │
│            │  │  │  GUESTBOOK           │    │     │               │
│            │  │  │  [Chat Bubble]       │    │     │               │
│            │  │  └──────────────────────┘    │     │               │
│            │  │                              │     │               │
│            │  └──────────────────────────────┘     │               │
│            │                                        │               │
├────────────┴────────────────────────────────────────┴───────────────┤
│  Mobile Preview: [📱 Mobile] [📱 Tablet] [💻 Desktop]                │
└─────────────────────────────────────────────────────────────────────┘
```

## 8.2 Section Library Panel (When Adding New Section)

```
┌────────────────────────────────────┐
│  ➕ TAMBAH SECTION BARU             │
├────────────────────────────────────┤
│                                    │
│  [Search sections...] 🔍           │
│                                    │
│  ━━ PEMBUKAAN ━━                   │
│  ┌──────────────────────────────┐  │
│  │ 🖼️ Hero / Pembukaan           │  │
│  │ ┌─────┐ ┌─────┐ ┌─────┐     │  │
│  │ │Foto │ │Split│ │Video│     │  │
│  │ │Full │ │Quote│ │ Bg  │     │  │
│  │ └─────┘ └─────┘ └─────┘     │  │
│  └──────────────────────────────┘  │
│                                    │
│  ━━ KONTEN ━━                      │
│  ┌──────────────────────────────┐  │
│  │ 👥 Profil Mempelai            │  │
│  │ 🖼️ Galeri Foto               │  │
│  │ 📅 Detail Acara              │  │
│  │ 💬 Quote / Ayat              │  │
│  └──────────────────────────────┘  │
│                                    │
│  ━━ INTERAKTIF ━━                  │
│  ┌──────────────────────────────┐  │
│  │ ✅ RSVP                       │  │
│  │ 💬 Buku Tamu                 │  │
│  │ ⏰ Countdown                  │  │
│  │ 🎁 Amplop Digital            │  │
│  │ 📹 Livestream                │  │
│  │ 📍 Lokasi / Maps             │  │
│  └──────────────────────────────┘  │
│                                    │
│  ━━ PENUTUP ━━                     │
│  ┌──────────────────────────────┐  │
│  │ 🙏 Terima Kasih               │  │
│  └──────────────────────────────┘  │
│                                    │
│  [X] Close                         │
└────────────────────────────────────┘
```

---

# BAGIAN 9: BUILD PHASES (UNTUK AI CODE AGENT)

## Phase 0: Project Setup & Infrastructure

### Tasks:
```
□ Initialize Next.js 16 project with TypeScript (strict mode), App Router, Cache Components enabled
□ Setup Drizzle ORM + PostgreSQL connection
□ Setup Redis connection (ioredis) — server-only, JANGAN diimpor di middleware
□ Setup S3-compatible storage client (AWS SDK v3, presigned URL)
□ Setup Better Auth — GOOGLE OAUTH ONLY (emailAndPassword: false), session store Redis
□ Run `npx @better-auth/cli generate` → commit generated auth schema (users/sessions/accounts/verifications)
□ Write migration untuk tabel app-level: user_profiles
□ Configure Tailwind CSS 4 + shadcn/ui
□ Setup Cloudflare Turnstile (site key + secret) untuk form publik
□ Setup environment variables (.env.example)
□ Setup ESLint + Prettier + Husky (git hooks)
□ Create Docker Compose for local dev (postgres + redis + minio)
□ Setup Sentry for error tracking
□ Create base folder structure (as defined above)
□ (BullMQ / worker TIDAK di phase ini — pakai Vercel Cron + after())
```

### Environment Variables:
```env
# .env.example

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/undangan
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# S3 Compatible Storage
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=undangan-uploads
S3_PUBLIC_URL=http://localhost:9000/undangan-uploads

# Auth (Google OAuth only)
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Anti-spam
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Cron (Vercel Cron memanggil /api/cron/* dengan header ini)
CRON_SECRET=

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM="Undangan Platform <noreply@undangan.com>"

# Payment (Midtrans)
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_WEBHOOK_SECRET=

# Analytics
SENTRY_DSN=
AXIOM_TOKEN=

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_INVITATION_DOMAINS=undangan.com,invitation.com,ngaturi.com
```

---

## Phase 1: MVP (Core Features)

### Sprint 1.1: Auth & Basic Setup
```
□ Implement /login page — satu tombol "Lanjutkan dengan Google"
□ Setup Better Auth Google provider + callback + session di Redis
□ On first sign-in: buat row user_profiles
□ Create dashboard layout (sidebar + header)
□ Middleware: cek session cookie saja (Edge-safe)
□ (dashboard)/layout.tsx: verifikasi sesi via auth.api.getSession; (admin)/layout.tsx: assert role
□ Create user profile page (read-only email dari Google + input phone)
```

### Sprint 1.2: Section System Foundation
```
□ Create section types & interfaces
□ Build SectionRegistry with 3 section types:
  - hero (2 variants)
  - couple-intro (2 variants)
  - event-details (1 variant)
□ Implement SectionRenderer component
□ Create basic section components with CSS Modules
□ Write unit tests for registry
```

### Sprint 1.3: Template System + Trial Entitlement
```
□ Create 3 template presets (JSON files):
  - elegant-gold.json
  - rustic-minimal.json
  - modern-clean.json
□ Build template gallery page
□ Build template preview page (live render)
□ Implement "Use This Template" flow (server action, transaksi DB):
  - Cek: user_profiles.free_invitation_used === false → izinkan; else arahkan ke /pricing
  - Clone composition ke invitation baru: plan='free_trial', edit_expires_at = now()+7d, has_watermark=true
  - Set user_profiles.free_invitation_used = true
  - Redirect ke builder
□ Guard unique index idx_invitations_one_free_trial (race condition)
```

### Sprint 1.4: Basic Builder
```
□ Build builder layout (3-panel: sections + canvas + properties)
□ Implement Zustand builder store (localStorage = draft-only; server updated_at = source of truth)
□ Load flow: fetch server → offer restore hanya jika draft lebih baru
□ Add / remove / reorder (up-down dulu) / edit props (form dari propsSchema)
□ Basic live preview (render sections in canvas)
□ Trial lock: jika invitation.is_edit_locked → builder read-only + banner ke /invitations/[id]/unlock
□ Server action saveInvitation: tolak 403 bila is_edit_locked; validasi composition via SectionSchema.superRefine
□ Setelah save sukses: revalidateTag(`invitation:${id}`)
```

### Sprint 1.5: Invitation Publishing
```
□ Implement [slug] dynamic route (public invitation page, Cache Components + cacheTag)
□ On-demand revalidation: revalidateTag pada publish/unpublish/edit
□ Generate slug dari input user (unik, lowercase-dash, cek tabrakan)
□ Publish/unpublish (free_trial boleh publish — render watermark bila has_watermark)
□ Share link (copy to clipboard) + WhatsApp share
□ SEO metadata + opengraph-image (nama + tanggal)
□ Cron /api/cron/lock-expired-edits (harian): set is_edit_locked=true utk trial lewat 7 hari
□ Cron /api/cron/archive-expired (harian): status='expired' utk lewat expires_at
```

### Sprint 1.6: RSVP System
```
□ Create RSVP API route (POST) di app/api/public/[slug]/rsvp
□ Build RSVP form section component (+ Turnstile widget + honeypot field)
□ RSVP validation (Zod schema)
□ Anti-spam: rate limit Redis (3/menit, 10/jam) + verifikasi Turnstile server-side
□ Duplicate prevention (unique index email & phone)
□ RSVP list page in dashboard + export CSV
```

## Phase 2: Enhanced Features

### Sprint 2.1: Media Upload
```
□ Implement S3 presigned URL generation API
□ Build media upload component (drag & drop)
□ Image optimization with Sharp (background job via BullMQ)
□ Media library page
□ Integrate media picker in builder (for gallery, hero, etc.)
```

### Sprint 2.2: Advanced Builder
```
□ Drag-and-drop reorder (dnd-kit)
□ Variant switcher UI
□ Style overrides editor (colors, fonts, spacing)
□ Global settings panel
□ Auto-save (debounced)
□ Undo/redo functionality
□ Preview device switcher (mobile/tablet/desktop)
```

### Sprint 2.3: Guestbook
```
□ Guestbook API (GET with pagination, POST)
□ Guestbook section components (2 variants)
□ Real-time updates (polling or SSE)
□ Moderation UI in dashboard
□ Like functionality
```

### Sprint 2.4: More Sections
```
□ Add sections:
  - gallery (3 variants)
  - countdown (2 variants)
  - guestbook (2 variants)
  - gift/amplop digital (2 variants)
  - quote (2 variants)
  - livestream (1 variant)
  - map-location (1 variant)
  - thank-you (1 variant)
```

### Sprint 2.5: Analytics
```
□ View tracking (fire-and-forget)
□ Unique visitor tracking (cookie/localStorage)
□ Daily stats aggregation (BullMQ job)
□ Analytics dashboard (charts with recharts)
□ Export data (CSV)
```

## Phase 3: Monetization & Polish

### Sprint 3.1: Payment Integration  ⚠️ NAIKKAN KE PHASE 1 (Sprint 1.7)
> Karena free_trial terkunci setelah 7 hari, monetisasi adalah jalur kritis MVP — bukan Phase 3.
```
□ Integrate Midtrans Snap (server: create transaction, client: snap.js)
□ /api/payments/create → buat row payments (kind, plan_tier, provider_order_id), return snapToken
□ Pricing page + /invitations/[id]/unlock page
□ Webhook /api/webhooks/payment: verify signature_key (sha512), idempoten by provider_order_id
□ On 'paid': terapkan efek per `kind` (unlock / renewal / business) — lihat komentar schema payments
□ Feature gating helper: canRemoveWatermark(inv), maxPhotos(inv), canUseGuestInvites(inv)
□ Email konfirmasi pembayaran (Resend)
```

### Sprint 3.2: Advanced Features
```
□ Undangan per-tamu (premium): CRUD guest_invites, generate ?to=<token>, template pesan WA, tracking opened_at
□ Multiple domain support (middleware update)
□ Music player
□ Video embed support
□ QR code generation (for sharing)
□ WhatsApp share integration (bulk dari daftar guest_invites)
□ Custom domain (per user, business feature)
□ Renewal flow (Rp 25k / 90 hari) + download galeri & ucapan
```

### Sprint 3.3: Admin Panel
```
□ Admin dashboard (platform stats)
□ Template management (CRUD)
□ User management
□ Payment monitoring
□ Content moderation
```

### Sprint 3.4: Performance & SEO
```
□ Optimize images (next/image with S3 loader)
□ Implement proper caching strategy
□ Sitemap generation
□ robots.txt
□ Structured data (JSON-LD)
□ Performance monitoring (Vercel Analytics)
```

## Phase 4: Production Launch

### Sprint 4.1: Testing
```
□ Write E2E tests (Playwright):
  - User registration & login
  - Template selection & customization
  - Invitation publishing
  - RSVP flow
  - Guestbook flow
  - Payment flow
□ Load testing (k6)
□ Security audit (dependency check, OWASP)
```

### Sprint 4.2: Deployment
```
□ Deploy to Vercel (app)
□ Setup Neon/Supabase (PostgreSQL)
□ Setup Upstash (Redis)
□ Setup Cloudflare R2 (S3 storage)
□ Setup Railway/Fly.io (BullMQ workers)
□ Configure custom domains
□ Setup monitoring (Sentry + Axiom)
□ Configure Vercel Cron (stats aggregation)
```

### Sprint 4.3: Launch Preparation
```
□ Write documentation (README, API docs)
□ Create onboarding flow for new users
□ Setup customer support channel
□ Marketing site (landing page polish)
□ Legal pages (Terms, Privacy)
□ Prepare launch content (social media, blog)
```

---

# BAGIAN 10: API SPECIFICATION

## 10.1 REST API Endpoints

```
┌─────────────────────────────────────────────────────────────┐
│                    API ENDPOINTS                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AUTH (Better Auth — Google only, route /api/auth/[...all]) │
│  ├── GET  /api/auth/sign-in/google  → redirect ke Google   │
│  ├── GET  /api/auth/callback/google                        │
│  ├── POST /api/auth/sign-out                               │
│  └── GET  /api/auth/get-session                            │
│  (tidak ada sign-up / email-password)                      │
│                                                             │
│  TEMPLATES                                                  │
│  ├── GET  /api/templates                                    │
│  │   ?category=wedding&tier=free&search=elegant            │
│  ├── GET  /api/templates/:templateId                        │
│  └── POST /api/templates/:templateId/use                   │
│      → Creates new invitation from template                 │
│                                                             │
│  INVITATIONS (requires auth)                                │
│  ├── GET    /api/invitations                               │
│  │   ?status=published&page=1&limit=10                     │
│  ├── GET    /api/invitations/:invitationId                  │
│  ├── PATCH  /api/invitations/:invitationId                  │
│  │   Body: { sections?, global_settings?, status? }       │
│  ├── DELETE /api/invitations/:invitationId                  │
│  ├── POST   /api/invitations/:invitationId/publish          │
│  └── POST   /api/invitations/:invitationId/unpublish        │
│                                                             │
│  INVITATION SECTIONS (requires auth)                        │
│  ├── PATCH  /api/invitations/:invitationId/sections         │
│  │   Body: { sections: SectionData[] }                     │
│  └── POST   /api/invitations/:invitationId/sections/:sectionId/duplicate │
│                                                             │
│  PUBLIC (no auth, on invitation pages)                      │
│  ├── POST /api/public/:slug/rsvp                            │
│  │   Body: { name, email?, phone?, status, guest_count,   │
│  │           guest_invite_token?, turnstile_token, _hp }  │
│  ├── GET  /api/public/:slug/guestbook                       │
│  │   ?page=1&limit=20                                      │
│  └── POST /api/public/:slug/guestbook                       │
│      Body: { name, message, turnstile_token, _hp }        │
│                                                             │
│  MEDIA (requires auth)                                      │
│  ├── POST /api/uploads/presign                              │
│  │   Body: { filename, contentType, size }                 │
│  │   Returns: { uploadUrl, fileKey, fileUrl }              │
│  ├── POST /api/uploads/confirm                              │
│  │   Body: { fileKey, width?, height? }                    │
│  └── GET  /api/media                                       │
│      ?invitationId=xxx                                     │
│                                                             │
│  PAYMENTS                                                   │
│  ├── POST /api/payments/create                              │
│  │   Body: { kind, planTier, invitationId? }              │
│  │   kind: invitation_unlock|invitation_renewal|business   │
│  │   Returns: { snapToken, orderId }                       │
│  └── POST /api/webhooks/payment                             │
│      (Midtrans webhook — verify sha512 signature_key)      │
│                                                             │
│  GUEST INVITES (requires auth, premium)                     │
│  ├── GET    /api/invitations/:id/guests                     │
│  ├── POST   /api/invitations/:id/guests  (single / bulk)   │
│  ├── PATCH  /api/invitations/:id/guests/:guestId            │
│  └── DELETE /api/invitations/:id/guests/:guestId            │
│                                                             │
│  ADMIN (requires admin role)                                │
│  ├── GET  /api/admin/stats                                  │
│  ├── GET  /api/admin/users                                  │
│  ├── PATCH /api/admin/users/:userId                         │
│  ├── GET  /api/admin/templates                              │
│  └── PATCH /api/admin/templates/:templateId                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# BAGIAN 11: PERFORMANCE & SCALING CONSIDERATIONS

## 11.1 Caching Strategy

```
┌─────────────────────────────────────────────────────┐
│                CACHING LAYERS                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Layer 1: CDN (Vercel Edge / Cloudflare)           │
│  ├── Static assets (images, CSS, JS)               │
│  └── ISR pages (invitation pages)                  │
│                                                     │
│  Layer 2: Next.js 16 Cache Components             │
│  ├── Invitation pages: `use cache` + cacheTag     │
│  │   (`invitation:<id>`), invalidasi ON-DEMAND    │
│  │   via revalidateTag saat edit/publish/RSVP     │
│  ├── Template preview pages (static)               │
│  └── Landing page (cacheLife: 'hours')            │
│                                                     │
│  Layer 3: Redis Cache                              │
│  ├── Session data                                  │
│  ├── Rate limiting counters                        │
│  ├── Template composition (hot data)              │
│  ├── Invitation data (for API responses)          │
│  └── Analytics aggregation buffer                  │
│                                                     │
│  Layer 4: Database                                 │
│  ├── PostgreSQL with proper indexes                │
│  └── Read replicas (when needed)                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 11.2 Image Optimization Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Upload     │────▶│  Background  │────▶│   Store to   │
│  (Original)  │     │   Worker     │     │  S3 (Multi)  │
└──────────────┘     │  (BullMQ)    │     └──────────────┘
                     └──────────────┘            │
                                                  │
                                    ┌─────────────┼─────────────┐
                                    ▼             ▼             ▼
                              ┌──────────┐ ┌──────────┐ ┌──────────┐
                              │Thumbnail │ │  Medium  │ │  Large   │
                              │ 400px    │ │  800px   │ │ 1600px   │
                              │ WebP     │ │  WebP    │ │  WebP    │
                              └──────────┘ └──────────┘ └──────────┘
                                    │             │             │
                                    └─────────────┼─────────────┘
                                                  │
                                                  ▼
                                     ┌────────────────────┐
                                     │  BlurHash generated │
                                     │  (for placeholder)  │
                                     └────────────────────┘
```

---

# BAGIAN 12: DATA RETENTION, PRIVACY & LEGAL

## 12.1 PII yang dikumpulkan
| Data | Sumber | Dasar |
|------|--------|-------|
| Nama, email, foto profil | Google OAuth | Kontrak layanan |
| Nomor HP owner | Input opsional | Consent |
| Nama + email/HP tamu (RSVP) | Diisi tamu | Consent — tampilkan notice singkat di form |
| Pesan ucapan, IP, user-agent | Guestbook / analytics | Legitimate interest (anti-spam) |

## 12.2 Retensi
- **Analytics granular (`invitation_views`)**: hapus baris > 12 bulan (cron bulanan); simpan agregat `invitation_daily_stats`.
- **Undangan `expired`**: composition + RSVP + ucapan disimpan **180 hari** setelah `expires_at`, lalu di-anonymize (hapus email/HP/IP tamu) kecuali user memperpanjang.
- **Akun dihapus user**: cascade hapus semua undangan & media dalam 30 hari (soft-delete → hard-delete).
- **Media di S3**: lifecycle rule — objek tanpa referensi `media_assets` dibersihkan mingguan.

## 12.3 Kewajiban
- Form RSVP & guestbook: notice "Data yang kamu isi akan dilihat oleh pemilik undangan" + link Kebijakan Privasi.
- Halaman `/legal/privacy` & `/legal/terms` wajib sebelum launch (Sprint 4.3).
- Owner bisa export & hapus data tamu per undangan (hak subjek data).
- Webhook & OAuth secret di env, tidak pernah ke client. `access_token`/`refresh_token` Google dienkripsi at-rest (Better Auth `secret`).

---

# KESIMPULAN

Dokumen ini mencakup seluruh spesifikasi untuk membangun platform undangan digital yang dijelaskan dalam diskusi kita. Dengan mengikuti phase-by-phase, AI code agent dapat membangun sistem ini secara terstruktur dan presisi.

**Tech Stack Final:**
- Next.js 16 (App Router, Cache Components, async request APIs) — monolith untuk MVP
- PostgreSQL + Drizzle ORM
- Redis (cache + rate limit + session); BullMQ hanya Phase 2
- S3-compatible (Cloudflare R2 untuk production, MinIO untuk dev)
- Better Auth — Google OAuth only
- Midtrans Snap — one-time payment per undangan
- TIDAK PERLU ElysiaJS terpisah untuk MVP (Next.js Server Actions cukup)

**Keputusan produk kunci (v1.1):**
- Login wajib Google. 1 undangan gratis / akun, masa edit 7 hari, lalu builder terkunci sampai bayar (Basic Rp 49k / Premium Rp 99k, sekali bayar per undangan).
- Undangan yang sudah publish tetap online walau trial habis — hanya editing yang dikunci.
- Monetisasi = jalur kritis MVP → Sprint payment dinaikkan ke Phase 1 (1.7).

**Estimasi Waktu Build secepatnya:**

