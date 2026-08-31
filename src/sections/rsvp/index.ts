import type { SectionDefinition } from "../types";
import { RsvpProps } from "../schema";
import { RsvpFormCard } from "./rsvp-form-card";

export { RsvpFormCard };

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
