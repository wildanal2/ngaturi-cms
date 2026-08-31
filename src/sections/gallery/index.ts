import type { SectionDefinition } from "../types";
import { GalleryProps } from "../schema";
import { dummyGallery } from "../dummy";
import { columnsField, imagesArray } from "../fields";
import { GalleryGrid } from "./gallery-grid";
import { GalleryMasonry } from "./gallery-masonry";
import { GalleryCarousel } from "./gallery-carousel";

export { GalleryGrid, GalleryMasonry, GalleryCarousel };

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
  },
};
