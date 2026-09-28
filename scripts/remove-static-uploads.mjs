import { rm } from "node:fs/promises";

// Uploaded objects are served by the authenticated Worker handler, not Pages'
// static asset layer. Keep source files untouched; remove only build output.
await rm("dist/uploads", { recursive: true, force: true });
