/**
 * Public placeholder images for template/section defaults. Free services:
 * - picsum.photos (Lorem Picsum, Unsplash-sourced, free to use)
 * - i.pravatar.cc (avatar faces, free)
 * Replace with your own photos in the builder.
 */

export const dummyHero = (seed = "ngaturi") =>
  `https://picsum.photos/seed/${seed}-hero/900/1200`;

export const dummyBride = "https://i.pravatar.cc/480?img=45";
export const dummyGroom = "https://i.pravatar.cc/480?img=13";

export const dummyGallery = (seed = "ngaturi") =>
  Array.from({ length: 6 }, (_, i) => ({
    url: `https://picsum.photos/seed/${seed}-g${i}/600/750`,
    caption: "",
  }));

export const dummyClosing = (seed = "ngaturi") =>
  `https://picsum.photos/seed/${seed}-closing/1000/1200`;
