import "@tanstack/react-start/server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerEnv } from "./env";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const UPLOAD_ROOT = path.join(PUBLIC_DIR, "uploads");

function cleanSegment(value: string) {
  return value.replace(/\\/g, "/").split("/").filter(Boolean).map((part) =>
    part.replace(/[^a-zA-Z0-9._-]/g, "-")
  ).join("/");
}

function publicBaseUrl() {
  return (getServerEnv("STORAGE_PUBLIC_BASE_URL") || getServerEnv("VITE_PUBLIC_SITE_URL") || "").replace(/\/$/, "");
}

export function getPublicUrl(bucket: string, objectPath: string) {
  const urlPath = `/uploads/${cleanSegment(bucket)}/${cleanSegment(objectPath)}`;
  const base = publicBaseUrl();
  return base ? `${base}${urlPath}` : urlPath;
}

export async function uploadObject(bucket: string, objectPath: string, bytes: Buffer) {
  const safeBucket = cleanSegment(bucket);
  const safePath = cleanSegment(objectPath);
  const target = path.join(UPLOAD_ROOT, safeBucket, safePath);
  if (!target.startsWith(path.join(UPLOAD_ROOT, safeBucket))) {
    throw new Error("Invalid storage path.");
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return { path: safePath, publicUrl: getPublicUrl(safeBucket, safePath) };
}
