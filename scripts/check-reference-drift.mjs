import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const source = "github:agentskills/agentskills";
const remote = "https://github.com/agentskills/agentskills";
const branch = "main";
const trackedPaths = [
  "docs/specification.mdx",
  "skills-ref/pyproject.toml",
  "skills-ref/src/skills_ref",
  "skills-ref/tests",
  "skills-ref/uv.lock",
];
const ignoredReferenceEntryNames = new Set(["__pycache__"]);

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = join(repoRoot, "docs/reference/agentskills-reference.lock.json");
const args = new Set(process.argv.slice(2));

function run(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function tryRun(command, commandArgs, options = {}) {
  try {
    return run(command, commandArgs, options);
  } catch {
    return "";
  }
}

function refreshSource() {
  if (args.has("--refresh")) {
    tryRun("vp", ["exec", "opensrc", "remove", source]);
  }

  run("vp", ["exec", "opensrc", "fetch", "--quiet", source]);
}

function resolveSourcePath() {
  const sourcePath = run("vp", ["exec", "opensrc", "path", source]);
  if (!existsSync(sourcePath)) {
    throw new Error(`Cached source path does not exist: ${sourcePath}`);
  }

  return sourcePath;
}

function walkFiles(rootPath) {
  const stat = statSync(rootPath);
  if (stat.isFile()) {
    return [rootPath];
  }

  if (!stat.isDirectory()) {
    return [];
  }

  return readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => !ignoredReferenceEntryNames.has(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => walkFiles(join(rootPath, entry.name)));
}

function trackedFiles(sourcePath) {
  return trackedPaths
    .flatMap((trackedPath) => {
      const absolutePath = join(sourcePath, trackedPath);
      if (!existsSync(absolutePath)) {
        throw new Error(`Tracked reference path does not exist: ${trackedPath}`);
      }
      return walkFiles(absolutePath);
    })
    .map((filePath) => relative(sourcePath, filePath).split(sep).join("/"))
    .sort((left, right) => left.localeCompare(right));
}

function hashFiles(sourcePath, files) {
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(readFileSync(join(sourcePath, file)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function remoteCommit() {
  const output = run("git", ["ls-remote", `${remote}.git`, `refs/heads/${branch}`]);
  const [commit] = output.split(/\s+/);
  if (!commit || !/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error(`Could not resolve ${remote} ${branch} commit`);
  }
  return commit;
}

function readLock() {
  if (!existsSync(lockPath)) {
    throw new Error(`Missing reference lock: ${lockPath}`);
  }
  return JSON.parse(readFileSync(lockPath, "utf8"));
}

refreshSource();

const sourcePath = resolveSourcePath();
const files = trackedFiles(sourcePath);
const nextLock = {
  version: 1,
  source,
  remote,
  branch,
  commit: remoteCommit(),
  trackedPaths,
  trackedContentSha256: hashFiles(sourcePath, files),
};

if (args.has("--update")) {
  writeFileSync(lockPath, `${JSON.stringify(nextLock, null, 2)}\n`);
  console.log(`Updated AgentSkills reference lock (${files.length} files).`);
  process.exit(0);
}

const lock = readLock();
if (lock.trackedContentSha256 !== nextLock.trackedContentSha256) {
  console.error("AgentSkills reference drift detected.");
  console.error(`Pinned:  ${lock.commit} ${lock.trackedContentSha256}`);
  console.error(`Current: ${nextLock.commit} ${nextLock.trackedContentSha256}`);
  console.error(
    "Run `vp run reference:update`, then align conformance tests or allowlist divergences.",
  );
  process.exit(1);
}

if (lock.commit !== nextLock.commit) {
  console.warn("AgentSkills upstream commit changed, but tracked reference content is unchanged.");
  console.warn("Run `vp run reference:update` if you want to refresh lock provenance.");
}

console.log(`AgentSkills reference lock verified (${files.length} files).`);
