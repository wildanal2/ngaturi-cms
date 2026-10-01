// CI-only Git/registry policy. Never installed on the production VM.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const VERSION_TAG = /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
export function publicationFor(event, ref) {
  if (event !== "push") return null;
  if (ref === "refs/heads/Staging") return "candidate";
  if (ref.startsWith("refs/tags/")) {
    if (!VERSION_TAG.test(ref.slice(10)))
      throw new Error(
        "Release tag must be strict vX.Y.Z (no leading zeroes or prerelease suffix)",
      );
    return "release";
  }
  return null;
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    timeout: 60000,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function verifySource(
  { event, ref, eventSha, forced = false },
  invoke = git,
) {
  const kind = publicationFor(event, ref);
  if (kind === "release" && forced)
    throw new Error("Force-updated release tags are forbidden");
  const sha = invoke(["rev-parse", "--verify", "HEAD^{commit}"]);
  if (!/^[0-9a-f]{40}$/.test(sha))
    throw new Error("Invalid checked-out commit");
  if (
    eventSha &&
    invoke([
      "rev-parse",
      "--verify",
      "--end-of-options",
      `${eventSha}^{commit}`,
    ]) !== sha
  ) {
    throw new Error("Checkout differs from the triggering commit");
  }
  const tag = kind === "release" ? ref.slice(10) : "";
  if (kind === "release") {
    const remote = invoke(["ls-remote", "origin", ref, `${ref}^{}`])
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split(/\s+/));
    const taggedCommit =
      remote.find((entry) => entry[1] === `${ref}^{}`)?.[0] ??
      remote.find((entry) => entry[1] === ref)?.[0];
    if (
      taggedCommit !== sha ||
      invoke(["rev-parse", "--verify", `${ref}^{commit}`]) !== sha
    ) {
      throw new Error(
        "Release tag was deleted/rewritten or differs from checkout",
      );
    }
    invoke(["fetch", "--no-tags", "origin", "refs/heads/main"]);
    try {
      invoke(["merge-base", "--is-ancestor", sha, "FETCH_HEAD"]);
    } catch {
      throw new Error("Tagged commit is not reachable from main");
    }
  }
  return { kind: kind ?? "validation", tag, sha };
}

export function releaseIdentity(tag, image, sha) {
  if (tag && !VERSION_TAG.test(tag))
    throw new Error("Release tag must be strict vX.Y.Z");
  if (
    !/^ghcr\.io\/[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(image) ||
    !/^[0-9a-f]{40}$/.test(sha)
  ) {
    throw new Error("Invalid release image or source SHA");
  }
  return {
    kind: tag ? "release" : "candidate",
    version: tag ? tag.slice(1) : null,
    image,
    sha,
    tag: tag || `sha-${sha}`,
  };
}

function docker(args) {
  return execFileSync("docker", ["buildx", "imagetools", ...args], {
    encoding: "utf8",
    timeout: 60000,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function inspectDigest(reference, invoke = docker) {
  try {
    const digest = invoke([
      "inspect",
      reference,
      "--format",
      "{{.Manifest.Digest}}",
    ]);
    if (!/^sha256:[0-9a-f]{64}$/.test(digest))
      throw new Error("Invalid registry digest");
    return digest;
  } catch (error) {
    const lines = String(error.stderr ?? "")
      .trim()
      .split("\n");
    if (lines.at(-1) === `ERROR: ${reference}: not found`) return null;
    throw new Error(`Cannot inspect ${reference}; registry check failed`);
  }
}

export function validateImage(config, identity) {
  const labels = config.config?.Labels ?? {};
  // Git/registry tags supply release versions. Images may originate as Staging
  // candidates, so no baked-in package/OCI version equality is required.
  if (
    config.os !== "linux" ||
    config.architecture !== "amd64" ||
    labels["org.opencontainers.image.revision"] !== identity.sha ||
    labels["org.opencontainers.image.source"] !==
      `https://github.com/${identity.image.slice(8)}` ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(
      labels["org.opencontainers.image.created"] ?? "",
    )
  ) {
    throw new Error(
      `${identity.tag} already exists incompatibly, or artifact metadata is invalid; do not overwrite it`,
    );
  }
  return labels["org.opencontainers.image.created"];
}

export function prepare(identity, invoke = docker) {
  const versionDigest =
    identity.kind === "release"
      ? inspectDigest(`${identity.image}:${identity.tag}`, invoke)
      : null;
  const shaDigest = inspectDigest(
    `${identity.image}:sha-${identity.sha}`,
    invoke,
  );
  if (versionDigest && shaDigest && versionDigest !== shaDigest)
    throw new Error(
      "Version and SHA tags conflict; release stopped before publication",
    );
  const digest = versionDigest ?? shaDigest;
  const created = digest
    ? validateImage(
        JSON.parse(
          invoke([
            "inspect",
            `${identity.image}@${digest}`,
            "--format",
            "{{json .Image}}",
          ]),
        ),
        identity,
      )
    : new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  return {
    image: identity.image,
    version: identity.version ?? "",
    tag: identity.tag,
    sha: identity.sha,
    kind: identity.kind,
    digest: digest ?? "",
    build: digest ? "false" : "true",
    created,
  };
}

function immutableTags(identity) {
  return identity.kind === "release"
    ? [identity.tag, `sha-${identity.sha}`]
    : [`sha-${identity.sha}`];
}

export function publish(identity, digest, invoke = docker) {
  if (!/^sha256:[0-9a-f]{64}$/.test(digest))
    throw new Error("Missing immutable build digest");
  const reference = `${identity.image}@${digest}`;
  const builtAt = validateImage(
    JSON.parse(invoke(["inspect", reference, "--format", "{{json .Image}}"])),
    identity,
  );
  const tags = immutableTags(identity);
  // Check all identities before performing any registry writes.
  const existing = tags.map((tag) =>
    inspectDigest(`${identity.image}:${tag}`, invoke),
  );
  for (const [index, tag] of tags.entries()) {
    if (existing[index] && existing[index] !== digest)
      throw new Error(
        `Refusing to overwrite ${tag}: immutable release collision`,
      );
  }
  for (const [index, tag] of tags.entries()) {
    if (!existing[index])
      invoke([
        "create",
        "--prefer-index=false",
        "--tag",
        `${identity.image}:${tag}`,
        reference,
      ]);
    if (inspectDigest(`${identity.image}:${tag}`, invoke) !== digest)
      throw new Error(`Digest mismatch for ${tag}`);
  }
  return {
    release_type: identity.kind,
    git_tag: identity.kind === "release" ? identity.tag : null,
    semantic_version: identity.version,
    git_sha: identity.sha,
    ghcr_image: identity.image,
    image: reference,
    digest,
    architecture: "linux/amd64",
    built_at: builtAt,
    tags: identity.kind === "release" ? [...tags, "stable"] : tags,
  };
}

export function promoteStable(identity, digest, invoke = docker) {
  if (identity.kind !== "release")
    throw new Error("Staging candidates cannot update stable");
  if (!/^sha256:[0-9a-f]{64}$/.test(digest))
    throw new Error("Missing immutable build digest");
  validateImage(
    JSON.parse(
      invoke([
        "inspect",
        `${identity.image}@${digest}`,
        "--format",
        "{{json .Image}}",
      ]),
    ),
    identity,
  );
  for (const tag of immutableTags(identity)) {
    if (inspectDigest(`${identity.image}:${tag}`, invoke) !== digest)
      throw new Error(`Stable stopped: digest mismatch for ${tag}`);
  }
  invoke([
    "create",
    "--prefer-index=false",
    "--tag",
    `${identity.image}:stable`,
    `${identity.image}@${digest}`,
  ]);
  if (inspectDigest(`${identity.image}:stable`, invoke) !== digest)
    throw new Error("stable digest mismatch");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const source = verifySource({
      event: process.env.GITHUB_EVENT_NAME,
      ref: process.env.GITHUB_REF,
      eventSha: process.env.GITHUB_SHA,
      forced: process.env.GITHUB_EVENT_PATH
        ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))
            .forced === true
        : false,
    });
    const command = process.argv[2];
    if (command === "verify") {
      for (const [key, value] of Object.entries(source))
        appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
      console.log(JSON.stringify(source));
    } else {
      if (source.kind === "validation")
        throw new Error("Publication is not authorized by this event/ref");
      const identity = releaseIdentity(
        source.tag,
        process.env.RELEASE_IMAGE,
        source.sha,
      );
      if (command === "prepare") {
        const result = prepare(identity);
        for (const [key, value] of Object.entries(result))
          appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
        console.log(JSON.stringify(result));
      } else if (command === "publish") {
        const manifest = publish(identity, process.env.RELEASE_DIGEST);
        writeFileSync(
          "release-manifest.json",
          `${JSON.stringify(manifest, null, 2)}\n`,
        );
        console.log(JSON.stringify(manifest));
        appendFileSync(
          process.env.GITHUB_STEP_SUMMARY,
          `${identity.kind} ${identity.tag}: \`${manifest.image}\` (${manifest.architecture})\n`,
        );
      } else if (command === "stable") {
        promoteStable(identity, process.env.RELEASE_DIGEST);
        appendFileSync(
          process.env.GITHUB_STEP_SUMMARY,
          `stable now references \`${identity.image}@${process.env.RELEASE_DIGEST}\`\n`,
        );
      } else throw new Error("Expected verify, prepare, publish or stable");
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
