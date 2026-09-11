import { EnchantedGardenStage } from "./stage";
import type { SceneQuality } from "./types";

/** Visual-only composition foundation. Ngaturi-owned content arrives in Phase 4. */
export function EnchantedGardenComposition({
  quality = "medium",
}: {
  quality?: SceneQuality;
}) {
  return <EnchantedGardenStage quality={quality} />;
}
