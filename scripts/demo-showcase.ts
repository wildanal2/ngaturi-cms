// Publikasikan beberapa undangan contoh untuk showcase landing.
// Jalankan: npx tsx --env-file=.env.local scripts/demo-showcase.ts
import { desc, like } from "drizzle-orm";
import { db } from "../src/lib/db";
import { invitations, users } from "../src/lib/db/schema";
import { TEMPLATES } from "../src/lib/templates/catalog";
import { makeSlug } from "../src/lib/invitation/slug";

const DEMOS = [
  { tpl: "kana-noir", names: "Kana & Arya", type: "wedding" as const },
  { tpl: "elegant-forest", names: "Dinda & Raka", type: "wedding" as const },
  { tpl: "islamic-classic", names: "Fatimah & Umar", type: "wedding" as const },
  { tpl: "khitan-joy", names: "Khitan Arkan", type: "khitan" as const },
];

async function main() {
  const [u] = await db.select().from(users).orderBy(desc(users.createdAt)).limit(1);
  if (!u) {
    console.log("no user — login once first");
    process.exit(1);
  }
  await db.delete(invitations).where(like(invitations.slug, "contoh-%"));

  for (const d of DEMOS) {
    const t = TEMPLATES.find((x) => x.id === d.tpl);
    if (!t) continue;
    const sections = t.sections.map((sec, i) => ({
      ...sec,
      id: `demo-${i}`,
      order: i,
    }));
    const heroIdx = sections.findIndex((s) => s.type === "hero");
    if (heroIdx >= 0) {
      sections[heroIdx] = {
        ...sections[heroIdx],
        props: { ...sections[heroIdx].props, couple_names: d.names },
      };
    }
    const eventDate = new Date(Date.now() + 40 * 86_400_000);
    await db.insert(invitations).values({
      slug: `contoh-${makeSlug(d.names)}`,
      userId: u.id,
      sourceTemplate: t.id,
      sections,
      globalSettings: t.global_settings,
      plan: "premium",
      isPaid: true,
      hasWatermark: false,
      status: "published",
      eventType: d.type,
      eventTitle: d.names,
      eventDate,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 120 * 86_400_000),
    });
    console.log("published demo:", d.names);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
