// Run with: npx tsx --env-file=.env.local scripts/seed.ts
import { inArray } from "drizzle-orm";
import { db } from "../src/lib/db";
import { templates, users } from "../src/lib/db/schema";
import { TEMPLATES } from "../src/lib/templates/catalog";

async function main() {
  // promote admins from ADMIN_EMAILS (comma-separated)
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length) {
    const promoted = await db
      .update(users)
      .set({ role: "admin" })
      .where(inArray(users.email, adminEmails))
      .returning({ email: users.email });
    console.log("promoted admins:", promoted.map((p) => p.email).join(", ") || "(none matched)");
  }

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
