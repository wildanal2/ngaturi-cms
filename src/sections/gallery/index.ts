import type { SectionDefinition } from "../types";
import { GalleryProps } from "../schema";
import { dummyGallery } from "../dummy";
import { columnsField, imagesArray } from "../fields";
import { GalleryGrid } from "./gallery-grid";
import { GalleryMasonry } from "./gallery-masonry";
import { GalleryCarousel } from "./gallery-carousel";
import { GallerySpotlight } from "./gallery-spotlight";
import { GalleryFloating17 } from "./gallery-floating17";

export {
  GalleryGrid,
  GalleryMasonry,
  GalleryCarousel,
  GallerySpotlight,
  GalleryFloating17,
};

export const gallerySection: SectionDefinition = {
  type: "gallery",
  name: "Galeri",
  description: "Kumpulan foto",
  icon: "Images",
  category: "content",
  dummyProps: (variantKey, base) => {
    if (Array.isArray(base.images) && base.images.length === 0) {
      base.images = dummyGallery(variantKey);
    }
  },
  variants: {
    grid: {
      name: "Grid Rapi",
      component: GalleryGrid,
      propsSchema: GalleryProps,
      fields: [columnsField, imagesArray],
      styleOptions: [
        {
          key: "gap",
          label: "Jarak antar foto",
          default: "tight",
          options: [
            { value: "tight", label: "Rapat" },
            { value: "loose", label: "Renggang" },
          ],
        },
        {
          key: "radius",
          label: "Sudut foto",
          default: "soft",
          options: [
            { value: "sharp", label: "Tajam" },
            { value: "soft", label: "Lembut" },
          ],
        },
      ],
      defaultProps: { images: [], columns: 3 },
    },
    masonry: {
      name: "Masonry",
      description: "Tinggi foto bervariasi",
      component: GalleryMasonry,
      propsSchema: GalleryProps,
      fields: [columnsField, imagesArray],
      defaultProps: { images: [], columns: 3 },
    },
    carousel: {
      name: "Carousel Geser",
      description: "Geser horizontal dengan snap",
      component: GalleryCarousel,
      propsSchema: GalleryProps,
      fields: [imagesArray],
      defaultProps: { images: [], columns: 3 },
    },
    floating17: {
      name: "Carousel Floating17",
      description: "Foto aktif di tengah dengan kedalaman 3D, tombol, swipe, dan lightbox",
      component: GalleryFloating17,
      propsSchema: GalleryProps,
      fields: [
        imagesArray,
        { kind: "image", key: "background_image", label: "Tekstur latar" },
        { kind: "image", key: "section_icon", label: "Ikon bagian" },
        { kind: "image", key: "divider_image", label: "Gambar divider" },
      ],
      defaultProps: {
        images: [],
        columns: 3,
        background_image: "/themes/sage-hijau-melayang/bg-floating17.png",
        section_icon: "/themes/sage-hijau-melayang/icon-gallery.svg",
        divider_image: "/themes/sage-hijau-melayang/divider.png",
      },
    },
    spotlight: {
      name: "Grid + Lightbox",
      description: "Grid 3 kolom, ketuk foto untuk layar penuh",
      component: GallerySpotlight,
      propsSchema: GalleryProps,
      fields: [imagesArray],
      defaultProps: { images: [], columns: 3 },
    },
  },
};
