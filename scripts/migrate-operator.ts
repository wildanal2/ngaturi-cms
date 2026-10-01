/** Separate operator job. Never import from application startup. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";

const args = process.argv.slice(2);
assert(
  args.every((arg) => ["--apply", "--require-empty"].includes(arg)),
  "Unknown migration argument",
);
const apply = args.includes("--apply");
const folder = process.env.MIGRATIONS_DIR ?? "/migration/sql";
let target: URL;
try {
  target = new URL(process.env.DATABASE_URL ?? "");
} catch {
  console.error("Valid DATABASE_URL is required");
  process.exit(1);
}
assert(target.hostname.endsWith(".neon.tech"), "Neon target required");
assert(!target.hostname.includes("-pooler."), "Direct endpoint required");
const identity = createHash("sha256")
  .update(target.hostname + target.pathname)
  .digest("hex");
if (apply) {
  assert.equal(
    process.env.MIGRATION_TARGET_SHA256,
    identity,
    "Explicit target confirmation required",
  );
}
const migrations = readMigrationFiles({ migrationsFolder: folder });
const expected = JSON.parse(
  readFileSync(`${folder}/expected-schema.json`, "utf8"),
) as {
  tables: Record<string, string[]>;
};
const client = postgres(process.env.DATABASE_URL!, {
  max: 1,
  ssl: { rejectUnauthorized: true },
  connect_timeout: 10,
  idle_timeout: 10,
  connection: {
    TimeZone: "UTC",
    application_name: "ngaturi-operator-migration",
    statement_timeout: 120000,
  },
  onnotice: () => {},
});

try {
  await client`select pg_advisory_lock(hashtext('ngaturi-operator-migration'))`;
  await client`select 1`;
  console.log(JSON.stringify({ tls: "verified", targetFingerprint: identity }));
  const tables = await client<{ schemaname: string; tablename: string }[]>`
    select schemaname, tablename from pg_catalog.pg_tables
    where schemaname not like 'pg_%' and schemaname <> 'information_schema'
  `;
  const hasJournal = tables.some(
    (t) => t.schemaname === "drizzle" && t.tablename === "__drizzle_migrations",
  );
  const records = hasJournal
    ? await client<
        { hash: string; created_at: string }[]
      >`select hash, created_at from drizzle.__drizzle_migrations order by created_at`
    : [];
  assert(
    records.length <= migrations.length,
    "Database is ahead of this migration bundle",
  );
  for (const [index, record] of records.entries()) {
    assert.equal(
      record.hash,
      migrations[index].hash,
      "Migration history differs from committed artifacts",
    );
    assert.equal(
      Number(record.created_at),
      migrations[index].folderMillis,
      "Migration ordering differs",
    );
  }
  if (!hasJournal && tables.length)
    throw new Error("Unmanaged nonempty schema; operator review required");
  if (args.includes("--require-empty"))
    assert.equal(
      tables.length,
      0,
      "Initial provisioning requires an empty database",
    );
  console.log(
    JSON.stringify({
      existingTables: tables.length,
      applied: records.length,
      pending: migrations.length - records.length,
      mode: apply ? "apply" : "inspect",
    }),
  );
  if (apply) {
    await migrate(drizzle(client), { migrationsFolder: folder });
    const journal = await client<
      { hash: string; created_at: string }[]
    >`select hash, created_at from drizzle.__drizzle_migrations order by created_at`;
    assert.equal(journal.length, migrations.length);
    for (const [index, row] of journal.entries()) {
      assert.equal(row.hash, migrations[index].hash);
      assert.equal(Number(row.created_at), migrations[index].folderMillis);
    }
    const columns = await client<{ table_name: string; column_name: string }[]>`
      select table_name, column_name from information_schema.columns where table_schema = 'public'
    `;
    const actual = new Set(
      columns.map((c) => `${c.table_name}.${c.column_name}`),
    );
    const committedColumns = new Set(
      Object.entries(expected.tables).flatMap(([table, names]) =>
        names.map((name) => `${table}.${name}`),
      ),
    );
    assert.deepEqual(
      actual,
      committedColumns,
      "Columns differ from committed schema",
    );
    const actualTables = await client<
      { schemaname: string; tablename: string }[]
    >`
      select schemaname, tablename from pg_catalog.pg_tables
      where schemaname not like 'pg_%' and schemaname <> 'information_schema'
    `;
    const allowed = new Set([
      ...Object.keys(expected.tables).map((t) => `public.${t}`),
      "drizzle.__drizzle_migrations",
    ]);
    assert.deepEqual(
      new Set(actualTables.map((t) => `${t.schemaname}.${t.tablename}`)),
      allowed,
    );
    console.log(
      JSON.stringify({
        result: "PASS",
        journal: journal.length,
        applicationTables: Object.keys(expected.tables).length,
      }),
    );
  }
} catch (error) {
  // Provider errors can contain credentials or SQL inputs. Never print them.
  console.error(
    JSON.stringify({
      result: "FAIL",
      code: (error as { code?: string }).code ?? (error as Error).name,
    }),
  );
  process.exitCode = 1;
} finally {
  await client`select pg_advisory_unlock(hashtext('ngaturi-operator-migration'))`.catch(
    () => {},
  );
  await client.end({ timeout: 2 });
}
