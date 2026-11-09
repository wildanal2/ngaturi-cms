// Build mirror only: no credentials, provider calls, database writes or deployment.
// node scripts/prepare-lakon-kencana-validation.mjs /tmp/ngaturi-lakon-validation-<name>
import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  readFile,
  writeFile,
  symlink,
  stat,
} from "node:fs/promises";
import { resolve, join } from "node:path";
const source = resolve(import.meta.dirname, "..");
const output = resolve(process.argv[2] || "/tmp/ngaturi-lakon-validation");
assert(
  output.startsWith("/tmp/ngaturi-") && output !== source,
  "Use a dedicated /tmp/ngaturi-* directory",
);
assert(
  !(await stat(output).catch(() => null)),
  "Output must be a new directory",
);
await mkdir(output, { recursive: true });
for (const name of ["src", "worker", "scripts"])
  await cp(join(source, name), join(output, name), { recursive: true });
for (const name of [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next-env.d.ts",
  "next.config.ts",
  "postcss.config.mjs",
  "vite.config.ts",
  "wrangler.jsonc",
  "wrangler.toml",
  "eslint.config.mjs",
])
  if (await stat(join(source, name)).catch(() => null))
    await cp(join(source, name), join(output, name));
for (const name of ["node_modules", "public"])
  await symlink(join(source, name), join(output, name), "dir");
const setup = await readFile(join(source, "src/test/setup-env.ts"), "utf8");
const block = setup.match(/const FAKE[\s\S]*?= \{([\s\S]*?)\n\};/)[1];
const env = Object.fromEntries(
  [...block.matchAll(/  (\w+): "([^"]*)"/g)].map((m) => [m[1], m[2]]),
);
delete env.NODE_ENV;
Object.assign(env, {
  BETTER_AUTH_URL: "https://localhost:3061",
  NEXT_PUBLIC_APP_URL: "https://localhost:3061",
  NEXT_PUBLIC_INVITATION_DOMAINS: "localhost:3061",
  NEXT_TELEMETRY_DISABLED: "1",
  SITE_INDEXING_ENABLED: "false",
  BETTER_AUTH_SECRET: "local-validation-fixture-secret-32-characters",
});
await writeFile(
  join(output, ".env.local"),
  Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n",
);
const config = join(output, "next.config.ts");
await writeFile(
  config,
  (await readFile(config, "utf8")).replace(
    'output: "standalone",',
    'output: "standalone",\n  webpack(config) { config.cache = false; return config; },',
  ),
);
for (const name of ["public", "builder", "shell", "isolation"]) {
  const route = join(
    output,
    "src/app",
    name === "isolation" ? "isolation-validation" : `lakon-validation-${name}`,
  );
  await mkdir(route, { recursive: true });
  await cp(
    join(source, "scripts/fixtures/lakon-kencana", `${name}.tsx`),
    join(route, "page.tsx"),
  );
}
console.log(
  `Prepared ${output}. Run npm run build -- --webpack there. For standalone: link public and .next/static into .next/standalone; run PORT=3061 HOSTNAME=127.0.0.1 node .next/standalone/server.js. Intercept every /api request and every action POST before browser interactions.`,
);
