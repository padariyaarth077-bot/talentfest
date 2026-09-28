import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const directory = "dist/_worker.js/_libs";
const file = (await readdir(directory)).find((name) => name.startsWith("cloudflare-mysql") && name.endsWith(".mjs"));
if (!file) throw new Error("Cloudflare MySQL bundle was not generated.");

const target = path.join(directory, file);
const source = await readFile(target, "utf8");
const importLine = 'import processModule from "node:process";';
const shim = `const processModule = globalThis.process ?? {
  browser: true,
  env: {},
  version: "",
  nextTick(callback, ...args) { queueMicrotask(() => callback(...args)); },
};`;

if (source.includes(importLine)) await writeFile(target, source.replace(importLine, shim));
else if (!source.includes("const processModule = globalThis.process")) {
  throw new Error("Cloudflare MySQL process import patch target changed.");
}
