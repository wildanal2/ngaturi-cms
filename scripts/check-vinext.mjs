import { rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredInput = join(root, ".agent-input");
const parkedInput = join(dirname(root), ".ngaturi-agent-input-vinext-check");
let parked = false;

try {
  try {
    await rename(ignoredInput, parkedInput);
    parked = true;
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ENOENT")) {
      throw error;
    }
  }

  const exitCode = await new Promise((resolve, reject) => {
    const executable = join(root, "node_modules", ".bin", "vinext");
    const child = spawn(executable, ["check"], {
      cwd: root,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  process.exitCode = exitCode;
} finally {
  if (parked) await rename(parkedInput, ignoredInput);
}
