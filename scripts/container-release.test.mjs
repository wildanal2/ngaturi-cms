import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import yaml from "js-yaml";
import {
  releaseIdentity,
  inspectDigest,
  prepare,
  promote,
} from "./container-release.mjs";

const image = "ghcr.io/wildanal2/ngaturi-cms";
const sha = "a".repeat(40);
const digest = "sha256:" + "b".repeat(64);
const other = "sha256:" + "c".repeat(64);
const identity = releaseIdentity("0.1.0", image, sha);
function fixture({ tags = {}, revision = sha, version = "0.1.0" } = {}) {
  const calls = [];
  const config = {
    os: "linux",
    architecture: "amd64",
    config: {
      Labels: {
        "org.opencontainers.image.revision": revision,
        "org.opencontainers.image.version": version,
        "org.opencontainers.image.source":
          "https://github.com/wildanal2/ngaturi-cms",
        "org.opencontainers.image.created": "2026-10-01T01:00:00Z",
      },
    },
  };
  const invoke = (args) => {
    calls.push(args);
    if (args[0] === "create") {
      assert(args.includes("--prefer-index=false"));
      tags[args[args.indexOf("--tag") + 1]] = args.at(-1).split("@")[1];
      return "";
    }
    if (args.at(-1) === "{{json .Image}}") return JSON.stringify(config);
    if (tags[args[1]]) return tags[args[1]];
    throw Object.assign(new Error("missing"), {
      stderr: `ERROR: ${args[1]}: not found\n`,
    });
  };
  return { invoke, calls, tags };
}

test("canonical semantic version accepts final releases and rejects unsafe versions", () => {
  for (const version of [
    "latest",
    "v0.1.0",
    "01.0.0",
    "1.0",
    "1.0.0-rc.1",
    "1.0.0;false",
  ]) {
    assert.throws(() => releaseIdentity(version, image, sha));
  }
  assert.equal(identity.tag, "v0.1.0");
});
test("only positively missing registry manifests allow publication", () => {
  assert.equal(inspectDigest(image + ":v0.1.0", fixture().invoke), null);
  for (const error of [
    "unauthorized",
    "connection refused",
    "429 too many requests",
    "not found",
  ]) {
    assert.throws(() =>
      inspectDigest(image, () => {
        throw Object.assign(new Error(error), { stderr: error });
      }),
    );
  }
  assert.throws(() => inspectDigest(image, () => "not-a-digest"));
});
test("new release builds once; compatible retry reuses the recorded image", () => {
  assert.equal(prepare(identity, fixture().invoke).build, "true");
  const f = fixture({ tags: { [image + ":v0.1.0"]: digest } });
  const result = prepare(identity, f.invoke);
  assert.equal(result.build, "false");
  assert.equal(result.digest, digest);
  assert(!f.calls.some((x) => x[0] === "create"));
  assert.equal(
    prepare(
      identity,
      fixture({ tags: { [image + ":sha-" + sha]: digest } }).invoke,
    ).build,
    "false",
  );
});
test("published version from another SHA/version or conflicting tags fails before writes", () => {
  for (const options of [{ revision: "c".repeat(40) }, { version: "1.0.0" }]) {
    const f = fixture({ ...options, tags: { [image + ":v0.1.0"]: digest } });
    assert.throws(() => prepare(identity, f.invoke), /incompatibly/);
    assert(!f.calls.some((x) => x[0] === "create"));
  }
  assert.throws(
    () =>
      prepare(
        identity,
        fixture({
          tags: { [image + ":v0.1.0"]: digest, [image + ":sha-" + sha]: other },
        }).invoke,
      ),
    /conflict/,
  );
});
test("promotion guards collisions again, and stable moves last to the same exact digest", () => {
  const f = fixture({ tags: { [image + ":sha-" + sha]: digest } });
  const manifest = promote(identity, digest, f.invoke);
  assert.equal(manifest.semantic_version, "0.1.0");
  assert.equal(manifest.git_sha, sha);
  assert.equal(manifest.architecture, "linux/amd64");
  assert.equal(manifest.image, `${image}@${digest}`);
  assert.equal(manifest.built_at, "2026-10-01T01:00:00Z");
  for (const tag of manifest.tags)
    assert.equal(f.tags[image + ":" + tag], digest);
  const writes = f.calls.filter((x) => x[0] === "create");
  assert.equal(
    writes.at(-1)[writes.at(-1).indexOf("--tag") + 1],
    image + ":stable",
  );
  const collision = fixture({ tags: { [image + ":v0.1.0"]: other } });
  assert.throws(() => promote(identity, digest, collision.invoke), /collision/);
  assert(!collision.calls.some((x) => x[0] === "create"));
});
test("workflow validates branches/PRs and publishes only a main push, with one build", () => {
  const workflow = yaml.load(
    readFileSync(
      new URL("../.github/workflows/container-release.yml", import.meta.url),
      "utf8",
    ),
  );
  assert(workflow.on.pull_request === null);
  assert.deepEqual(workflow.on.push.branches, ["**"]);
  assert.equal(workflow.on.workflow_dispatch, undefined);
  assert.equal(
    workflow.jobs.publish.if,
    "github.event_name == 'push' && github.ref == 'refs/heads/main'",
  );
  assert.equal(workflow.jobs.publish.permissions.packages, "write");
  assert.equal(workflow.permissions.packages, undefined);
  const builds = workflow.jobs.publish.steps.filter((x) =>
    x.uses?.startsWith("docker/build-push-action"),
  );
  assert.equal(builds.length, 1);
  assert.equal(builds[0].with.push, true);
  assert(!builds[0].with.tags.includes("stable"));
  assert(!builds[0].with.tags.includes("latest"));
  const promotion = workflow.jobs.publish.steps.find((x) =>
    x.name?.startsWith("Promote same digest"),
  );
  assert(promotion.run.includes("git ls-remote origin refs/heads/main"));
  assert(promotion.run.includes('"$current_main" != "$RELEASE_SHA"'));
  assert.equal(workflow.jobs["image-validation"].steps.at(-1).with.push, false);
  for (const path of [
    ".github/workflows/deploy.yml",
    "vercel.json",
    "compose.prod.yml",
    "ops/ngaturi-cron@.service",
    "ops/ngaturi-lock-expired-edits.timer",
  ]) {
    assert(!existsSync(new URL("../" + path, import.meta.url)));
  }
});
