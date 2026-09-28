import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const root = path.resolve("legacy-uploads/employee-awards");
const env = Object.fromEntries((await readFile(".env.local", "utf8"))
  .split(/\r?\n/)
  .map((line) => line.match(/^([^#=]+)=(.*)$/))
  .filter(Boolean)
  .map(([, key, value]) => [key.trim(), value.trim().replace(/^['\"]|['\"]$/g, "")]));

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  }));
  return nested.flat();
}

function mimeType(file) {
  const ext = path.extname(file).toLowerCase();
  return ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
}

const connection = await mysql.createConnection({
  host: env.MYSQL_HOST,
  port: Number(env.MYSQL_PORT || 3306),
  database: env.MYSQL_DATABASE,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
});

try {
  for (const file of await files(root)) {
    const objectPath = path.relative(root, file).replaceAll("\\", "/");
    const body = await readFile(file);
    await connection.execute(
      `INSERT IGNORE INTO uploaded_objects (object_key, bucket, object_path, body_base64, content_type, size_bytes)
       VALUES (?, 'employee-awards', ?, ?, ?, ?)`,
      [`employee-awards/${objectPath}`, objectPath, body.toString("base64"), mimeType(file), body.byteLength],
    );
  }
} finally {
  await connection.end();
}
