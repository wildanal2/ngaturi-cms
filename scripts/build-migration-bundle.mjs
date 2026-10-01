import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { build } from "esbuild";

const output = resolve(process.argv[2] ?? "dist/migration-job");
const folder = "src/lib/db/migrations";
const journalPath = `${folder}/meta/_journal.json`;
const committed = (path) => execFileSync("git", ["show", `HEAD:${path}`]);
const journal = JSON.parse(committed(journalPath));
await mkdir(join(output, "sql/meta"), { recursive: true });
await writeFile(join(output, "sql/meta/_journal.json"), committed(journalPath));
const hashes = [];
for (const entry of journal.entries) {
  const bytes = committed(`${folder}/${entry.tag}.sql`);
  await writeFile(join(output, "sql", `${entry.tag}.sql`), bytes);
  hashes.push({
    tag: entry.tag,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
const snapshotName = execFileSync(
  "git",
  ["ls-tree", "--name-only", `HEAD:${folder}/meta`],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter((name) => /^\d{4}_snapshot\.json$/.test(name))
  .sort()
  .at(-1);
if (!snapshotName) throw new Error("Committed schema snapshot is missing");
const snapshot = JSON.parse(committed(`${folder}/meta/${snapshotName}`));
const tables = Object.fromEntries(
  Object.values(snapshot.tables).map((t) => [
    t.name,
    Object.values(t.columns).map((c) => c.name),
  ]),
);
await writeFile(
  join(output, "sql/expected-schema.json"),
  JSON.stringify({ tables }),
);
await build({
  entryPoints: ["scripts/migrate-operator.ts"],
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  outfile: join(output, "migrate.mjs"),
});
await copyFile("compose.migrate.yml", join(output, "compose.migrate.yml"));
await writeFile(
  join(output, "manifest.json"),
  JSON.stringify(
    {
      sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      schemaSnapshot: snapshotName,
      migrations: hashes,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Operator bundle: ${output}`);
