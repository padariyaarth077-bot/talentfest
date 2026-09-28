import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const directory = "dist/_worker.js/_libs";
const file = (await readdir(directory)).find((name) => name.startsWith("mysql2") && name.endsWith(".mjs"));
if (!file) throw new Error("mysql2 bundle was not generated.");

const target = path.join(directory, file);
let source = await readFile(target, "utf8");
const importLine = 'import processModule from "node:process";';
const shim = `const processModule = globalThis.process ?? {
  browser: true,
  env: {},
  version: "",
  nextTick(callback, ...args) { queueMicrotask(() => callback(...args)); },
};`;

let patched = false;

// Replace ESM import
if (source.includes(importLine)) {
  source = source.replace(importLine, shim);
  patched = true;
}

// Replace CommonJS require calls - match the full variable declaration
const requirePattern = /var process(\$\d+)? = __require\("node:process"\);/g;
const matches = source.match(requirePattern);
if (matches) {
  source = source.replace(requirePattern, `const process$1 = globalThis.process ?? { browser: true, env: {}, version: "", nextTick(callback, ...args) { queueMicrotask(() => callback(...args)); } };`);
  patched = true;
}

if (patched) {
  await writeFile(target, source);
  console.log("mysql2 bundle patched successfully");
} else {
  console.log("mysql2 bundle patch: no changes needed");
}