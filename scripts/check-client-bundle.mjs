import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const assetsDir = join(process.cwd(), "dist", "assets");
const workerConfigPath = join(process.cwd(), "dist", "_worker.js", "wrangler.json");
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

const workerConfig = JSON.parse(await readFile(workerConfigPath, "utf8"));
const flags = new Set(workerConfig.compatibility_flags ?? []);
if (!flags.has("nodejs_compat")) {
  console.error("Cloudflare worker build is missing nodejs_compat.");
  process.exit(1);
}
