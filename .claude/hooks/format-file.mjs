#!/usr/bin/env node
// PostToolUse hook: runs ESLint --fix then Prettier --write on any file
// created/edited by Write|Edit|NotebookEdit. Project-scoped only.
// Never blocks the tool call: always exits 0.

import { spawnSync } from "node:child_process";
import { existsSync, readSync } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..", "..");
const LINTABLE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORED_DIRS = ["node_modules", ".next", "out", "build"];

function readStdin() {
  const chunks = [];
  const buf = Buffer.alloc(65536);
  while (true) {
    let bytesRead;
    try {
      bytesRead = readSync(0, buf, 0, buf.length, null);
    } catch (e) {
      if (e.code === "EAGAIN") continue;
      break;
    }
    if (bytesRead === 0) break;
    chunks.push(Buffer.from(buf.subarray(0, bytesRead)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function done(extraOutput) {
  if (extraOutput) process.stdout.write(JSON.stringify(extraOutput));
  process.exit(0);
}

function resolveBin(name) {
  const ext = process.platform === "win32" ? ".cmd" : "";
  const local = path.join(PROJECT_ROOT, "node_modules", ".bin", `${name}${ext}`);
  return existsSync(local) ? local : null;
}

function run(binName, args) {
  const bin = resolveBin(binName);
  // On Windows, local bins are .cmd shims — spawnSync requires shell: true
  // to execute them (EINVAL otherwise). npx itself is also a .cmd on Windows.
  const useShell = process.platform === "win32";
  if (bin) {
    return spawnSync(bin, args, { cwd: PROJECT_ROOT, encoding: "utf8", shell: useShell });
  }
  // Fallback if the local bin isn't present for some reason.
  return spawnSync("npx", ["--yes", binName, ...args], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    shell: useShell,
  });
}

let raw = "";
try {
  raw = readStdin();
} catch {
  done();
}

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  done();
}

const filePathRaw = payload?.tool_response?.filePath ?? payload?.tool_input?.file_path;
if (!filePathRaw) done();

const absPath = path.resolve(PROJECT_ROOT, filePathRaw);
const rel = path.relative(PROJECT_ROOT, absPath);

if (rel.startsWith("..") || path.isAbsolute(rel)) done();
if (IGNORED_DIRS.some((d) => rel.split(path.sep).includes(d))) done();
if (!existsSync(absPath)) done();

let messages = "";

const ext = path.extname(absPath);
if (LINTABLE_EXT.has(ext)) {
  const eslintResult = run("eslint", ["--fix", "--no-warn-ignored", absPath]);
  if (eslintResult.status !== 0) {
    messages +=
      (eslintResult.stdout || "") +
      (eslintResult.stderr || "") +
      (eslintResult.error ? String(eslintResult.error.message) : "");
  }
}

const prettierResult = run("prettier", ["--write", "--ignore-unknown", absPath]);
if (prettierResult.status !== 0) {
  messages +=
    (prettierResult.stdout || "") +
    (prettierResult.stderr || "") +
    (prettierResult.error ? String(prettierResult.error.message) : "");
}

if (messages.trim()) {
  done({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `ESLint/Prettier reported issues on ${rel}:\n${messages.trim()}`,
    },
  });
} else {
  done({ suppressOutput: true });
}
