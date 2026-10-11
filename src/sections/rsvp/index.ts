import { RsvpCinematicVintage } from "./rsvp-cinematic-vintage";
import type { SectionDefinition } from "../types";
import { RsvpProps } from "../schema";
import { RsvpFormCard } from "./rsvp-form-card";
import { RsvpSerambiDelima } from "./rsvp-serambi-delima";

export { RsvpFormCard, RsvpSerambiDelima };

export const rsvpSection: SectionDefinition = {
  type: "rsvp",
  name: "RSVP",
  description: "Konfirmasi kehadiran",
  icon: "CircleCheck",
  category: "interactive",
  variants: {
    "form-card": {
      name: "Form Card",
      component: RsvpFormCard,
      propsSchema: RsvpProps,
      fields: [
        { kind: "boolean", key: "require_phone", label: "Wajib nomor WhatsApp" },
        {
          kind: "select",
          key: "max_guests_per_person",
          label: "Maks. tamu per orang",
          options: [
            { value: "1", label: "1" },
            { value: "2", label: "2" },
            { value: "3", label: "3" },
            { value: "5", label: "5" },
          ],
        },
        { kind: "date", key: "deadline", label: "Batas waktu RSVP (opsional)" },
      ],
      defaultProps: { max_guests_per_person: 2, require_phone: false },
    },
  },
};

rsvpSection.variants["cinematic-vintage"] = {
  ...rsvpSection.variants["form-card"],
  name: "Cinematic Vintage",
  component: RsvpCinematicVintage,
};

rsvpSection.variants["serambi-delima"] = {
  ...rsvpSection.variants["form-card"],
  name: "Serambi Delima",
  description: "Konfirmasi kehadiran dalam panel seremonial gading dan emas",
  component: RsvpSerambiDelima,
  isPremium: true,
};
