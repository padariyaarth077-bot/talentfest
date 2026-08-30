import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const file = join(
  process.cwd(),
  "node_modules",
  "cloudflare-mysql",
  "cloudflare-mysql",
  "lib",
  "protocol",
  "PacketWriter.js",
);

if (!existsSync(file)) process.exit(0);

const broken = "  oldBuffer.copyWithin(this._buffer);";
const fixed = "  oldBuffer.copy(this._buffer);";
const source = readFileSync(file, "utf8");

if (source.includes(fixed)) process.exit(0);
if (!source.includes(broken)) {
  throw new Error("cloudflare-mysql PacketWriter patch target changed.");
}

writeFileSync(file, source.replace(broken, fixed));
console.log("Patched cloudflare-mysql PacketWriter buffer resize.");
