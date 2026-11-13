import { inArray } from "drizzle-orm";
import { db, type Database } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { TEMPLATES, getTemplate } from "./catalog";
import { canonicalTemplateId, templateIdentityAliases } from "./identity";

type TemplateStatus = { id: string; isActive: boolean };

// Missing rows remain available: code-backed presets are lazily materialized.
// A disabled legacy alias also disables its canonical preset.
export function filterActiveTemplates(rows: TemplateStatus[]) {
  const inactive = new Set(
    rows
      .filter((row) => !row.isActive)
      .map((row) => canonicalTemplateId(row.id)),
  );
  return TEMPLATES.filter((template) => !inactive.has(template.id));
}

export async function getActiveTemplates() {
  const rows = await db
    .select({ id: templates.id, isActive: templates.isActive })
    .from(templates);
  return filterActiveTemplates(rows);
}

export async function getActiveTemplate(id: string) {
  const template = getTemplate(id);
  if (!template) return undefined;
  return (await getActiveTemplates()).find((item) => item.id === template.id);
}

// Called after materialization inside the selection transaction. SHARE blocks
// an admin status update until this selection commits, including alias rows.
export async function assertTemplateActive(
  tx: Pick<Database, "select">,
  id: string,
) {
  const rows = await tx
    .select({ id: templates.id, isActive: templates.isActive })
    .from(templates)
    .where(inArray(templates.id, templateIdentityAliases(id)))
    .for("share");
  if (!rows.length || rows.some((row) => !row.isActive)) {
    throw new Error("Template nonaktif. Silakan pilih template lain.");
  }
}
