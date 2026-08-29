import { z } from "zod";

export const HeroProps = z.object({
  couple_names: z.string().min(1),
  event_date: z.string(),
  tagline: z.string().optional(),
  background_image: z.string().optional(),
  overlay_opacity: z.number().min(0).max(1).default(0.45),
  has_countdown: z.boolean().default(true),
});

export const PersonProps = z.object({
  name: z.string(),
  full_name: z.string().optional(),
  bio: z.string().optional(),
  photo: z.string().optional(),
  instagram: z.string().optional(),
  parents: z.string().optional(),
  child_order: z.string().optional(),
});

export const CoupleIntroProps = z.object({
  bride: PersonProps,
  groom: PersonProps,
});

export const EventDetailsProps = z.object({
  events: z.array(
    z.object({
      name: z.string(),
      date: z.string(),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
      venue_name: z.string(),
      address: z.string().optional(),
      maps_url: z.string().optional(),
    }),
  ),
});

export const GalleryProps = z.object({
  images: z.array(
    z.object({
      url: z.string(),
      caption: z.string().optional(),
    }),
  ),
  columns: z.number().min(1).max(4).default(3),
});

export const CountdownProps = z.object({
  target_date: z.string(),
  message_expired: z.string().default("Acara telah berlangsung"),
});

export const QuoteProps = z.object({
  text: z.string(),
  source: z.string().optional(),
});

export const RsvpProps = z.object({
  deadline: z.string().optional(),
  max_guests_per_person: z.number().default(2),
  require_phone: z.boolean().default(false),
});

export const GuestbookProps = z.object({
  require_approval: z.boolean().default(true),
});

export const GiftProps = z.object({
  intro: z.string().default("Doa restu Anda merupakan karunia yang sangat berarti."),
  bank_accounts: z.array(
    z.object({
      bank_name: z.string(),
      account_number: z.string(),
      account_name: z.string(),
    }),
  ),
});

export const GlobalSettingsSchema = z.object({
  font_family: z.string().default("Fraunces"),
  color_primary: z.string().default("#34503f"),
  color_secondary: z.string().default("#7a2e3c"),
  color_background: z.string().default("#fbf8f3"),
  animation: z.enum(["none", "fade", "slide", "zoom"]).default("fade"),
  music_url: z.string().optional(),
  is_rtl: z.boolean().default(false),
});

export const SECTION_PROPS_SCHEMAS: Record<string, z.ZodTypeAny> = {
  hero: HeroProps,
  "couple-intro": CoupleIntroProps,
  "event-details": EventDetailsProps,
  gallery: GalleryProps,
  countdown: CountdownProps,
  quote: QuoteProps,
  rsvp: RsvpProps,
  guestbook: GuestbookProps,
  gift: GiftProps,
};

export const SectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  variant: z.string(),
  order: z.number().int().min(0),
  visible: z.boolean().default(true),
  props: z.record(z.string(), z.unknown()),
  style_overrides: z.record(z.string(), z.unknown()).optional(),
});

export const CompositionSchema = z.object({
  template_version: z.string().default("1.0"),
  global_settings: GlobalSettingsSchema,
  sections: z.array(SectionSchema),
});

export type Composition = z.infer<typeof CompositionSchema>;
