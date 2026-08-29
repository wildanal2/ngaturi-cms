// Run with: npx tsx --env-file=.env.local scripts/seed.ts
import { db } from "../src/lib/db";
import { templates } from "../src/lib/db/schema";
import { TEMPLATES } from "../src/lib/templates/catalog";

async function main() {
  for (const t of TEMPLATES) {
    await db
      .insert(templates)
      .values({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        tier: t.tier,
        thumbnail: t.thumbnail,
        composition: {
          global_settings: t.global_settings,
          sections: t.sections,
        },
        isActive: true,
      })
      .onConflictDoUpdate({
        target: templates.id,
        set: {
          name: t.name,
          description: t.description,
          category: t.category,
          tier: t.tier,
          thumbnail: t.thumbnail,
          composition: {
            global_settings: t.global_settings,
            sections: t.sections,
          },
          updatedAt: new Date(),
        },
      });
    console.log("seeded template:", t.id);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
