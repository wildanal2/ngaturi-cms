import type { z } from "zod";
import type { StoryProps } from "../schema";

export type CinematicStoryItem = z.infer<typeof StoryProps>["items"][number];

/** One presentation filter for omission, rendering and timeline topology. */
export function cinematicStoryItems(items: unknown): CinematicStoryItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter(
    (item): item is CinematicStoryItem =>
      item != null &&
      [item.title, item.description].some(
        (value) => typeof value === "string" && value.trim().length > 0,
      ),
  );
}
