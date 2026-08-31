import type { SectionDefinition } from "../types";
import { EventDetailsProps } from "../schema";
import { eventsArray, nowPlus } from "../fields";
import { EventTimeline } from "./event-timeline";
import { EventCards } from "./event-cards";
import { EventFormal } from "./event-formal";

export { EventTimeline, EventCards, EventFormal };

const introField = {
  kind: "textarea" as const,
  key: "intro",
  label: "Kalimat pembuka (opsional)",
};

const maps = "https://www.google.com/maps/search/?api=1&query=-6.914744,107.609810";

const sampleEvents = [
  { name: "Akad Nikah", date: nowPlus(45), start_time: "08:00", end_time: "10:00", venue_name: "Masjid Al-Falah", address: "Jl. Melati No. 10, Bandung", maps_url: maps },
  { name: "Resepsi", date: nowPlus(45), start_time: "11:00", end_time: "14:00", venue_name: "Gedung Serbaguna Graha Melati", address: "Jl. Melati No. 12, Bandung", maps_url: maps },
  { name: "Unduh Mantu", date: nowPlus(46), start_time: "10:00", end_time: "13:00", venue_name: "Kediaman Mempelai Pria", address: "Jl. Kenanga No. 5, Bandung", maps_url: maps },
];

export const eventsSection: SectionDefinition = {
  type: "event-details",
  name: "Rangkaian Acara",
  description: "Akad, resepsi, dan lokasi",
  icon: "CalendarClock",
  category: "content",
  variants: {
    timeline: {
      name: "Timeline",
      description: "Daftar vertikal berurutan",
      component: EventTimeline,
      propsSchema: EventDetailsProps,
      fields: [eventsArray],
      defaultProps: { events: sampleEvents },
    },
    cards: {
      name: "Kartu Berdampingan",
      description: "Dua kartu acara sejajar",
      component: EventCards,
      propsSchema: EventDetailsProps,
      fields: [eventsArray],
      defaultProps: {
        events: sampleEvents.map((e) => {
          const copy = { ...e };
          delete (copy as Partial<typeof e>).maps_url;
          return copy;
        }),
      },
    },
    formal: {
      name: "Tanggal Besar",
      description: "Kartu putih, angka tanggal besar, kalimat pembuka",
      component: EventFormal,
      propsSchema: EventDetailsProps,
      fields: [introField, eventsArray],
      defaultProps: {
        intro:
          "Dengan memohon rahmat dan ridho Allah SWT, kami bermaksud menyelenggarakan acara pernikahan putra-putri kami.",
        events: [sampleEvents[0], sampleEvents[1]],
      },
    },
  },
};
