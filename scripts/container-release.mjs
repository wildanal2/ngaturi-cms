// CI-only registry policy. Never installed on the production VM.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";

export function releaseIdentity(version, image, sha) {
  if (!/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(version)) {
    throw new Error(
      "package.json version must be a final X.Y.Z release (no leading zeroes)",
    );
  }
  if (
    !/^ghcr\.io\/[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(image) ||
    !/^[0-9a-f]{40}$/.test(sha)
  ) {
    throw new Error("Invalid release image or source SHA");
  }
  return { version, image, sha, tag: `v${version}` };
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
    // Only a positively identified missing manifest allows a new publication.
    // Authentication, connectivity, throttling and malformed output fail closed.
    const lines = String(error.stderr ?? "")
      .trim()
      .split("\n");
    if (lines.at(-1) === `ERROR: ${reference}: not found`) return null;
    throw new Error(`Cannot inspect ${reference}; registry check failed`);
  }
}

export function validateImage(config, identity) {
  const labels = config.config?.Labels ?? {};
  if (
    config.os !== "linux" ||
    config.architecture !== "amd64" ||
    labels["org.opencontainers.image.revision"] !== identity.sha ||
    labels["org.opencontainers.image.version"] !== identity.version ||
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
  const versionDigest = inspectDigest(
    `${identity.image}:${identity.tag}`,
    invoke,
  );
  const shaDigest = inspectDigest(
    `${identity.image}:sha-${identity.sha}`,
    invoke,
  );
  if (versionDigest && shaDigest && versionDigest !== shaDigest) {
    throw new Error(
      "Version and SHA tags conflict; release stopped before publication",
    );
  }
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
    version: identity.version,
    tag: identity.tag,
    digest: digest ?? "",
    build: digest ? "false" : "true",
    created,
  };
}

export function promote(identity, digest, invoke = docker) {
  if (!/^sha256:[0-9a-f]{64}$/.test(digest))
    throw new Error("Missing immutable build digest");
  const reference = `${identity.image}@${digest}`;
  const builtAt = validateImage(
    JSON.parse(invoke(["inspect", reference, "--format", "{{json .Image}}"])),
    identity,
  );
  // Recheck immediately before assigning immutable human-readable tags.
  for (const tag of [identity.tag, `sha-${identity.sha}`]) {
    const existing = inspectDigest(`${identity.image}:${tag}`, invoke);
    if (existing && existing !== digest)
      throw new Error(
        `Refusing to overwrite ${tag}: immutable release collision`,
      );
    if (!existing)
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
  // stable moves last; copying a single manifest preserves its exact digest.
  invoke([
    "create",
    "--prefer-index=false",
    "--tag",
    `${identity.image}:stable`,
    reference,
  ]);
  if (inspectDigest(`${identity.image}:stable`, invoke) !== digest)
    throw new Error("stable digest mismatch");
  return {
    semantic_version: identity.version,
    git_sha: identity.sha,
    ghcr_image: identity.image,
    image: reference,
    digest,
    architecture: "linux/amd64",
    built_at: builtAt,
    tags: [identity.tag, "stable", `sha-${identity.sha}`],
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  try {
    const { version } = JSON.parse(readFileSync("package.json", "utf8"));
    const identity = releaseIdentity(
      version,
      process.env.RELEASE_IMAGE,
      process.env.RELEASE_SHA,
    );
    if (process.argv[2] === "prepare") {
      const result = prepare(identity);
      for (const [key, value] of Object.entries(result))
        appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
      console.log(JSON.stringify(result));
    } else if (process.argv[2] === "promote") {
      const manifest = promote(identity, process.env.RELEASE_DIGEST);
      writeFileSync(
        "release-manifest.json",
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
      console.log(JSON.stringify(manifest));
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `Release v${version}: \`${manifest.image}\` (${manifest.architecture})\n`,
      );
    } else throw new Error("Expected prepare or promote");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
