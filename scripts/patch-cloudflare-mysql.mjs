import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const root = join(process.cwd(), "node_modules", "cloudflare-mysql", "cloudflare-mysql");
if (!existsSync(root)) process.exit(0);

let patched = 0;
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".js")) {
      let s = readFileSync(p, "utf8");
      const orig = s;
      s = s.replace(/from "(\.[^"]+)"/g, (m, im) => {
        if (im.endsWith(".js") || im.endsWith(".json") || im.endsWith(".mjs")) return m;
        if (/\.[a-z]+$/i.test(im)) return m;
        const base = resolve(dirname(p), im);
        if (existsSync(base) && statSync(base).isDirectory() && existsSync(join(base, "index.js"))) return `from "${im}/index.js"`;
        if (existsSync(`${base}.js`)) return `from "${im}.js"`;
        return `from "${im}.js"`;
      });
      if (s !== orig) { writeFileSync(p, s); patched++; }
    }
  }
}
walk(root);
if (patched) console.log(`Patched ${patched} cloudflare-mysql ESM import(s).`);

const file = join(root, "lib", "protocol", "PacketWriter.js");
const source = readFileSync(file, "utf8");
const broken = "  oldBuffer.copyWithin(this._buffer);";
const fixed = "  oldBuffer.copy(this._buffer);";
if (!source.includes(fixed) && !source.includes(broken)) throw new Error("cloudflare-mysql PacketWriter patch target changed.");
if (source.includes(broken)) { writeFileSync(file, source.replace(broken, fixed)); console.log("Patched cloudflare-mysql PacketWriter buffer resize."); }