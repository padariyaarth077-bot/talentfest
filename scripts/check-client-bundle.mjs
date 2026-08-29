import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const assetsDir = join(process.cwd(), "dist", "assets");
const blocked = [
  "node:process",
  "node:net",
  "node:tls",
  "mysql2",
  "__vite-browser-external",
  "No such module",
];

async function jsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(path);
    return entry.isFile() && entry.name.endsWith(".js") ? [path] : [];
  }));
  return files.flat();
}

const offenders = [];
for (const file of await jsFiles(assetsDir)) {
  const source = await readFile(file, "utf8");
  for (const token of blocked) {
    if (source.includes(token)) offenders.push(`${file}: ${token}`);
  }
}

if (offenders.length) {
  console.error("Server-only code leaked into the browser bundle:");
  console.error(offenders.join("\n"));
  process.exit(1);
}

