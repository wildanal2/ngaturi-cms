import type { SectionDefinition } from "../types";
import { MapProps } from "../schema";
import { MapEmbed } from "./map-embed";
import { MapButton } from "./map-button";

export { MapEmbed, MapButton };

export const mapSection: SectionDefinition = {
  type: "map-location",
  name: "Peta Lokasi",
  description: "Peta atau tombol ke Google Maps",
  icon: "MapPin",
  category: "content",
  variants: {
    embed: {
      name: "Peta Tersemat",
      description: "Iframe Google Maps",
      component: MapEmbed,
      propsSchema: MapProps,
      fields: [
        { kind: "text", key: "venue_name", label: "Nama tempat" },
        { kind: "textarea", key: "address", label: "Alamat" },
        {
          kind: "url",
          key: "embed_url",
          label: "URL embed",
          help: "Maps → Bagikan → Sematkan peta → salin src",
        },
      ],
      defaultProps: { venue_name: "Gedung Serbaguna", address: "Jl. Melati No. 12, Bandung" },
    },
    button: {
      name: "Tombol Maps",
      description: "Tombol buka Google Maps",
      component: MapButton,
      propsSchema: MapProps,
      fields: [
        { kind: "text", key: "venue_name", label: "Nama tempat" },
        { kind: "textarea", key: "address", label: "Alamat" },
        { kind: "url", key: "maps_url", label: "Link Google Maps" },
      ],
      defaultProps: { venue_name: "Gedung Serbaguna", address: "Jl. Melati No. 12, Bandung" },
    },
  },
};
