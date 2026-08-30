import "@tanstack/react-start/server-only";
import { getServerEnv } from "./env";

let storageTableReady = false;

function cleanSegment(value: string) {
  return value.replace(/\\/g, "/").split("/").filter(Boolean).map((part) =>
    part.replace(/[^a-zA-Z0-9._-]/g, "-")
  ).join("/");
}

function contentType(objectPath: string) {
  const ext = objectPath.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "pdf") return "application/pdf";
  return "image/jpeg";
}

function publicBaseUrl() {
  return (getServerEnv("STORAGE_PUBLIC_BASE_URL") || getServerEnv("VITE_PUBLIC_SITE_URL") || "").replace(/\/$/, "");
}

export function getPublicUrl(bucket: string, objectPath: string) {
  const urlPath = `/uploads/${cleanSegment(bucket)}/${cleanSegment(objectPath)}`;
  const base = publicBaseUrl();
  return base ? `${base}${urlPath}` : urlPath;
}

function objectKey(bucket: string, objectPath: string) {
  const safeBucket = cleanSegment(bucket);
  const safePath = cleanSegment(objectPath);
  if (!safeBucket || !safePath) throw new Error("Invalid storage path.");
  return { safeBucket, safePath, key: `${safeBucket}/${safePath}` };
}

function toBytes(value: ArrayBuffer | Uint8Array) {
  return value instanceof Uint8Array ? value : new Uint8Array(value);
}

function bytesToBase64(value: ArrayBuffer | Uint8Array) {
  const bytes = toBytes(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function ensureStorageTable() {
  if (storageTableReady) return;
  storageTableReady = true;
}

export async function uploadObject(bucket: string, objectPath: string, bytes: ArrayBuffer | Uint8Array) {
  const { safeBucket, safePath, key } = objectKey(bucket, objectPath);
  const raw = toBytes(bytes);
  await ensureStorageTable();
  const { execute } = await import("./index");
  await execute(
    `INSERT INTO uploaded_objects (object_key, bucket, object_path, body_base64, content_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       body_base64 = VALUES(body_base64),
       content_type = VALUES(content_type),
       size_bytes = VALUES(size_bytes),
       updated_at = CURRENT_TIMESTAMP`,
    [key, safeBucket, safePath, bytesToBase64(raw), contentType(safePath), raw.byteLength],
  );
  return { path: safePath, publicUrl: getPublicUrl(safeBucket, safePath) };
}

export async function serveUploadedObject(request: Request) {
  const url = new URL(request.url);
  const rawPath = decodeURIComponent(url.pathname.replace(/^\/uploads\//, ""));
  const safePath = cleanSegment(rawPath);
  if (!safePath || safePath !== rawPath.replace(/\\/g, "/").split("/").filter(Boolean).join("/")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    await ensureStorageTable();
    const { queryOne } = await import("./index");
    const row = await queryOne<{ body_base64: string; content_type: string }>(
      "SELECT body_base64, content_type FROM uploaded_objects WHERE object_key = ? LIMIT 1",
      [safePath],
    );
    if (!row) return new Response("Not found", { status: 404 });
    return new Response(base64ToBytes(row.body_base64), {
      headers: {
        "content-type": row.content_type,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Not found", { status: 404 });
  }
}
