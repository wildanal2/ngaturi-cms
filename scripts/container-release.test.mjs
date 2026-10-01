import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";
import {
  publicationFor,
  verifySource,
  releaseIdentity,
  inspectDigest,
  prepare,
  publish,
  promoteStable,
} from "./container-release.mjs";

const image = "ghcr.io/wildanal2/ngaturi-cms";
const sha = "a".repeat(40);
const digest = "sha256:" + "b".repeat(64);
const other = "sha256:" + "c".repeat(64);
const identity = releaseIdentity("v2.3.4", image, sha);
const candidate = releaseIdentity("", image, sha);
function fixture({ tags = {}, revision = sha } = {}) {
  const calls = [];
  const config = {
    os: "linux",
    architecture: "amd64",
    config: {
      Labels: {
        "org.opencontainers.image.revision": revision,
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

test("event policy: feature/PR/main validate only; Staging candidates; strict tags release", () => {
  for (const ref of [
    "refs/heads/main",
    "refs/heads/feature",
    "refs/heads/staging",
  ])
    assert.equal(publicationFor("push", ref), null);
  for (const ref of ["refs/heads/Staging", "refs/tags/v2.3.4"])
    assert.equal(publicationFor("pull_request", ref), null);
  assert.equal(publicationFor("push", "refs/heads/Staging"), "candidate");
  assert.equal(publicationFor("push", "refs/tags/v2.3.4"), "release");
  for (const tag of [
    "latest",
    "stable",
    "2.3.4",
    "v02.3.4",
    "v2.3",
    "v2.3.4-rc.1",
    "v2.3.4+build",
  ]) {
    assert.throws(
      () => publicationFor("push", "refs/tags/" + tag),
      /strict vX.Y.Z/,
    );
    assert.throws(() => releaseIdentity(tag, image, sha));
  }
  assert.equal(identity.version, "2.3.4");
  assert.equal(candidate.version, null);
});

test("real Git fixtures: lightweight/annotated tags on main ancestry pass; other branches, mismatched checkout and rewritten tags fail", () => {
  const directory = mkdtempSync(join(tmpdir(), "ngaturi-release-git-"));
  const origin = join(directory, "origin.git"),
    work = join(directory, "work");
  const git = (args, cwd = work) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  try {
    execFileSync("git", ["init", "--bare", origin], { stdio: "ignore" });
    execFileSync("git", ["init", "-b", "main", work], { stdio: "ignore" });
    git(["config", "user.name", "Release test fixture"]);
    git(["config", "user.email", "fixture@example.invalid"]);
    git(["remote", "add", "origin", origin]);
    const commit = (message) => {
      git([
        "commit",
        "--allow-empty",
        "-m",
        message,
        "-m",
        "Co-Authored-By: Codex <codex@openai.com>",
      ]);
      return git(["rev-parse", "HEAD"]);
    };
    const tagged = commit("fixture main ancestor");
    git(["tag", "v2.3.4"]);
    git(["tag", "-a", "v2.3.5", "-m", "fixture annotated release"]);
    const annotation = git(["rev-parse", "refs/tags/v2.3.5"]);
    commit("fixture newer main commit");
    git(["push", "origin", "main", "refs/tags/v2.3.4", "refs/tags/v2.3.5"]);
    git(["checkout", "--detach", tagged]);
    assert.equal(
      verifySource(
        { event: "push", ref: "refs/tags/v2.3.4", eventSha: tagged },
        git,
      ).sha,
      tagged,
    );
    assert.equal(
      verifySource(
        { event: "push", ref: "refs/tags/v2.3.5", eventSha: annotation },
        git,
      ).sha,
      tagged,
    );
    assert.throws(
      () =>
        verifySource(
          {
            event: "push",
            ref: "refs/tags/v2.3.4",
            eventSha: tagged,
            forced: true,
          },
          git,
        ),
      /Force-updated/,
    );
    git(["checkout", "-b", "outside-main"]);
    const outside = commit("fixture outside main");
    git(["tag", "v9.8.7"]);
    git(["push", "origin", "refs/tags/v9.8.7"]);
    assert.throws(
      () =>
        verifySource(
          { event: "push", ref: "refs/tags/v9.8.7", eventSha: outside },
          git,
        ),
      /not reachable from main/,
    );
    assert.throws(
      () =>
        verifySource(
          { event: "push", ref: "refs/tags/v2.3.4", eventSha: tagged },
          git,
        ),
      /triggering commit/,
    );
    assert.throws(
      () =>
        verifySource(
          { event: "push", ref: "refs/tags/v2.3.4", eventSha: outside },
          git,
        ),
      /deleted\/rewritten/,
    );
    assert.throws(
      () =>
        verifySource(
          { event: "push", ref: "refs/tags/v2.3", eventSha: outside },
          git,
        ),
      /strict vX.Y.Z/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("only positively missing registry manifests allow publication", () => {
  assert.equal(inspectDigest(image + ":v2.3.4", fixture().invoke), null);
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

test("Staging publishes only a SHA candidate and cannot move stable", () => {
  const f = fixture();
  assert.equal(prepare(candidate, f.invoke).build, "true");
  assert(f.calls.every((call) => !call[1].includes(":v")));
  const manifest = publish(candidate, digest, f.invoke);
  assert.equal(manifest.semantic_version, null);
  assert.equal(manifest.git_tag, null);
  assert.deepEqual(manifest.tags, [`sha-${sha}`]);
  assert.deepEqual(Object.keys(f.tags), [`${image}:sha-${sha}`]);
  assert.throws(
    () => promoteStable(candidate, digest, f.invoke),
    /cannot update stable/,
  );
});

test("tag release reuses same-source candidate/retry without version-label/package equality", () => {
  assert.equal(prepare(identity, fixture().invoke).build, "true");
  for (const tags of [
    { [image + ":v2.3.4"]: digest },
    { [image + ":sha-" + sha]: digest },
  ]) {
    const f = fixture({ tags });
    const result = prepare(identity, f.invoke);
    assert.equal(result.build, "false");
    assert.equal(result.digest, digest);
    assert(!f.calls.some((call) => call[0] === "create"));
  }
});

test("incompatible existing version/SHA identities fail before writes", () => {
  for (const tag of ["v2.3.4", "sha-" + sha]) {
    const f = fixture({
      revision: "c".repeat(40),
      tags: { [image + ":" + tag]: digest },
    });
    assert.throws(() => prepare(identity, f.invoke), /incompatibly/);
    assert(!f.calls.some((call) => call[0] === "create"));
  }
  const f = fixture({
    tags: { [image + ":v2.3.4"]: digest, [image + ":sha-" + sha]: other },
  });
  assert.throws(() => prepare(identity, f.invoke), /conflict/);
  assert.throws(() => publish(identity, digest, f.invoke), /collision/);
  assert(!f.calls.some((call) => call[0] === "create"));
});

test("version/SHA publication does not move stable; final stable promotion verifies equal digest", () => {
  const f = fixture({
    tags: { [image + ":sha-" + sha]: digest, [image + ":stable"]: other },
  });
  const manifest = publish(identity, digest, f.invoke);
  assert.equal(manifest.semantic_version, "2.3.4");
  assert.equal(manifest.git_tag, "v2.3.4");
  assert.equal(manifest.image, `${image}@${digest}`);
  assert.equal(f.tags[image + ":stable"], other);
  promoteStable(identity, digest, f.invoke);
  for (const tag of manifest.tags)
    assert.equal(f.tags[image + ":" + tag], digest);
  const writes = f.calls.filter((call) => call[0] === "create");
  assert.equal(
    writes.at(-1)[writes.at(-1).indexOf("--tag") + 1],
    image + ":stable",
  );
  f.tags[image + ":v2.3.4"] = other;
  const count = f.calls.length;
  assert.throws(
    () => promoteStable(identity, digest, f.invoke),
    /digest mismatch/,
  );
  assert(!f.calls.slice(count).some((call) => call[0] === "create"));
});

test("workflow publishes only Staging/tag pushes after validation; single build; stable after artifacts", () => {
  const workflow = yaml.load(
    readFileSync(
      new URL("../.github/workflows/container-release.yml", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(workflow.on.pull_request, null);
  assert.deepEqual(workflow.on.push.branches, ["**"]);
  assert.deepEqual(workflow.on.push.tags, ["**"]);
  assert.equal(workflow.on.workflow_dispatch, undefined);
  assert.equal(
    workflow.jobs.publish.if,
    "github.event_name == 'push' && (github.ref == 'refs/heads/Staging' || startsWith(github.ref, 'refs/tags/'))",
  );
  assert.equal(workflow.jobs.publish.needs, "validate");
  assert.equal(
    workflow.jobs["image-validation"].if,
    "needs.validate.outputs.kind == 'validation'",
  );
  assert.equal(workflow.jobs.publish.permissions.packages, "write");
  assert.equal(workflow.permissions.packages, undefined);
  assert.equal(
    workflow.jobs.publish.concurrency.group,
    "ngaturi-ghcr-publication",
  );
  const steps = workflow.jobs.publish.steps;
  const builds = steps.filter((step) =>
    step.uses?.startsWith("docker/build-push-action"),
  );
  assert.equal(builds.length, 1);
  assert.equal(builds[0].with.push, true);
  assert(builds[0].with.tags.includes(":sha-"));
  assert(!builds[0].with.tags.includes("stable"));
  assert(!builds[0].with.labels.includes("image.version"));
  const upload = steps.findIndex((step) =>
    step.uses?.startsWith("actions/upload-artifact"),
  );
  const stable = steps.findIndex(
    (step) => step.run === "node scripts/container-release.mjs stable",
  );
  assert(stable > upload);
  assert.equal(steps[stable].if, "steps.release.outputs.kind == 'release'");
  assert.equal(workflow.jobs["image-validation"].steps.at(-1).with.push, false);
  for (const job of [workflow.jobs.validate, workflow.jobs.publish])
    assert.equal(job.steps[0].with["fetch-depth"], 0);
  const helper = readFileSync(
    new URL("./container-release.mjs", import.meta.url),
    "utf8",
  );
  assert(!helper.includes("package.json"));
  assert(!helper.includes("image.version"));
  for (const path of [
    ".github/workflows/deploy.yml",
    "vercel.json",
    "compose.prod.yml",
    "ops/ngaturi-cron@.service",
  ])
    assert(!existsSync(new URL("../" + path, import.meta.url)));
});
