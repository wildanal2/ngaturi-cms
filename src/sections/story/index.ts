import type { Field, SectionDefinition } from "../types";
import { StoryProps } from "../schema";
import { dummyGallery } from "../dummy";
import { StoryTimeline } from "./story-timeline";

export { StoryTimeline };

const itemsField: Field = {
  kind: "array",
  key: "items",
  label: "Momen",
  addLabel: "Tambah momen",
  itemLabel: "Momen",
  defaultItem: { year: "", title: "", description: "", image: "" },
  itemFields: [
    { kind: "text", key: "year", label: "Tahun" },
    { kind: "text", key: "title", label: "Judul momen" },
    { kind: "textarea", key: "description", label: "Cerita" },
    { kind: "image", key: "image", label: "Foto (opsional)" },
  ],
};

const sample = [
  { year: "2019", title: "Pertemuan Pertama", description: "Kami pertama bertemu di kampus, tak menyangka akan sejauh ini." },
  { year: "2022", title: "Pacaran", description: "Memutuskan menjalani hubungan yang lebih serius." },
  { year: "2025", title: "Lamaran", description: "Acara lamaran sederhana bersama kedua keluarga." },
];

export const storySection: SectionDefinition = {
  type: "story",
  name: "Kisah Cinta",
  description: "Garis waktu perjalanan hubungan: tahun, momen, cerita, foto",
  icon: "HeartHandshake",
  category: "content",
  dummyProps: (_variantKey, base) => {
    const items = base.items as { image?: string }[] | undefined;
    if (Array.isArray(items)) {
      const imgs = dummyGallery("story");
      base.items = items.map((it, i) => ({
        ...it,
        image: it.image || imgs[i % imgs.length]?.url,
      }));
    }
  },
  variants: {
    timeline: {
      name: "Garis Waktu",
      description: "Garis vertikal bertitik dengan kartu foto per momen",
      component: StoryTimeline,
      propsSchema: StoryProps,
      fields: [
        { kind: "text", key: "eyebrow", label: "Teks kecil di atas" },
        { kind: "text", key: "title", label: "Judul" },
        itemsField,
      ],
      defaultProps: { eyebrow: "Our Journey", title: "Kisah Cinta", items: sample },
    },
  },
};
