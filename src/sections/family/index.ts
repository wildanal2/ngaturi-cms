import type { Field, SectionDefinition } from "../types";
import { FamilyProps } from "../schema";
import { FamilyInvited } from "./family-invited";
import { FamilyParty } from "./family-party";

export { FamilyInvited, FamilyParty };

const groupsField: Field = {
  kind: "array",
  key: "groups",
  label: "Keluarga",
  addLabel: "Tambah keluarga",
  itemLabel: "Keluarga",
  defaultItem: { title: "Keluarga Besar", names: [] },
  itemFields: [
    { kind: "text", key: "title", label: "Judul (mis. Keluarga Mempelai Wanita)" },
    { kind: "textarea", key: "names", label: "Nama (satu per baris)" },
  ],
};

const membersField: Field = {
  kind: "array",
  key: "members",
  label: "Anggota",
  addLabel: "Tambah anggota",
  itemLabel: "Anggota",
  defaultItem: { name: "", role: "", photo: "" },
  itemFields: [
    { kind: "text", key: "name", label: "Nama" },
    { kind: "text", key: "role", label: "Peran (opsional)" },
    { kind: "image", key: "photo", label: "Foto (opsional)" },
  ],
};

export const familySection: SectionDefinition = {
  type: "family",
  name: "Keluarga & Party",
  description: "Turut mengundang (daftar nama keluarga) atau bridesmaid & groomsman",
  icon: "Users",
  category: "content",
  variants: {
    invited: {
      name: "Turut Mengundang",
      description: "Kartu per keluarga berisi daftar nama",
      component: FamilyInvited,
      propsSchema: FamilyProps,
      fields: [
        { kind: "text", key: "eyebrow", label: "Teks kecil di atas" },
        { kind: "text", key: "title", label: "Judul" },
        { kind: "textarea", key: "intro", label: "Kalimat pembuka (opsional)" },
        groupsField,
      ],
      defaultProps: {
        eyebrow: "With Blessing",
        title: "Turut Mengundang",
        groups: [
          {
            title: "Keluarga Mempelai Wanita",
            names: ["Bapak H. Ahmad Yusuf", "Ibu Hj. Siti Maryam", "Bapak Drs. Hendra"],
          },
          {
            title: "Keluarga Mempelai Pria",
            names: ["Bapak Drs. Budi Santoso", "Ibu Rina Wati", "Bapak H. Hasan"],
          },
        ],
      },
    },
    party: {
      name: "Bridesmaid & Groomsman",
      description: "Grid avatar bulat + nama & peran",
      component: FamilyParty,
      propsSchema: FamilyProps,
      fields: [
        { kind: "text", key: "eyebrow", label: "Teks kecil di atas" },
        { kind: "text", key: "title", label: "Judul" },
        membersField,
      ],
      defaultProps: {
        eyebrow: "The Party",
        title: "Bridesmaid & Groomsman",
        members: [
          { name: "Anna", role: "Bridesmaid" },
          { name: "Sari", role: "Bridesmaid" },
          { name: "Lia", role: "Bridesmaid" },
          { name: "Andre", role: "Groomsman" },
          { name: "Bayu", role: "Groomsman" },
          { name: "Rian", role: "Groomsman" },
        ],
      },
    },
  },
};
