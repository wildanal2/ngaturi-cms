"use client";

import dynamic from "next/dynamic";
import type { SectionRenderProps } from "../types";

// Keep schema registration synchronous; load template rendering only when used.
export const LoadingLakon = dynamic<SectionRenderProps>(
  () => import("./sections").then((m) => m.LoadingLakon),
  { loading: () => null },
);
export const CoverLakon = dynamic<SectionRenderProps>(
  () => import("./sections").then((m) => m.CoverLakon),
  { loading: () => null },
);
export const HeroLakon = dynamic<SectionRenderProps>(
  () => import("./sections").then((m) => m.HeroLakon),
  { loading: () => null },
);
export const CoupleLakon = dynamic<SectionRenderProps>(
  () => import("./sections").then((m) => m.CoupleLakon),
  { loading: () => null },
);
export const QuoteLakon = dynamic<SectionRenderProps>(
  () => import("./sections").then((m) => m.QuoteLakon),
  { loading: () => null },
);
export const StoryLakon = dynamic<SectionRenderProps>(
  () => import("./sections").then((m) => m.StoryLakon),
  { loading: () => null },
);
export const EventsLakon = dynamic<SectionRenderProps>(
  () => import("./sections").then((m) => m.EventsLakon),
  { loading: () => null },
);
export const MapLakon = dynamic<SectionRenderProps>(
  () => import("./sections").then((m) => m.MapLakon),
  { loading: () => null },
);
export const CountdownLakon = dynamic<SectionRenderProps>(
  () => import("./sections").then((m) => m.CountdownLakon),
  { loading: () => null },
);
export const ClosingLakon = dynamic<SectionRenderProps>(
  () => import("./sections").then((m) => m.ClosingLakon),
  { loading: () => null },
);
export const GalleryLakon = dynamic<SectionRenderProps>(
  () => import("./gallery").then((m) => m.GalleryLakon),
  { loading: () => null },
);
export const RsvpLakon = dynamic<SectionRenderProps>(
  () => import("./forms").then((m) => m.RsvpLakon),
  { loading: () => null },
);
export const GuestbookLakon = dynamic<SectionRenderProps>(
  () => import("./forms").then((m) => m.GuestbookLakon),
  { loading: () => null },
);
export const GiftLakon = dynamic<SectionRenderProps>(
  () => import("./forms").then((m) => m.GiftLakon),
  { loading: () => null },
);
export const MusicLakon = dynamic<SectionRenderProps>(
  () => import("./chrome").then((m) => m.MusicLakon),
  { loading: () => null },
);
export const NavigationLakon = dynamic<SectionRenderProps>(
  () => import("./chrome").then((m) => m.NavigationLakon),
  { loading: () => null },
);
