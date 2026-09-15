import "@tanstack/react-start/server-only";
import { getCloudflareEnv, getServerEnv } from './env';

function requiredEnv(name: string): string {
  const value = getServerEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

type HyperdriveBinding = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

function hyperdriveBinding(): HyperdriveBinding | undefined {
  return getCloudflareEnv()?.HYPERDRIVE as HyperdriveBinding | undefined;
}

function connectionOptions() {
  const binding = hyperdriveBinding();
  if (binding) {
    return {
      host: binding.host,
      port: binding.port,
      database: binding.database,
      user: binding.user,
      password: binding.password,
      charset: 'utf8mb4',
      timezone: '+00:00',
      dateStrings: true,
    };
  }

  return {
    host: requiredEnv('MYSQL_HOST'),
    port: parseInt(getServerEnv('MYSQL_PORT') || '3306', 10),
    database: requiredEnv('MYSQL_DATABASE'),
    user: requiredEnv('MYSQL_USER'),
    password: requiredEnv('MYSQL_PASSWORD'),
    charset: 'utf8mb4',
    timezone: '+00:00',
    dateStrings: true,
  };
}

async function createDatabaseConnection() {
  if (typeof process !== "undefined" && process.versions?.node) {
    const { createConnection } = await import("mysql2");
    return createConnection(connectionOptions());
  }

  // Pages wraps this package differently from Node. Support both module shapes.
  const driver = await import("cloudflare-mysql/cloudflare-mysql/index.js") as any;
  const createConnection = driver.createConnection ?? driver.default?.createConnection;
  if (typeof createConnection !== "function") {
    throw new Error("Cloudflare MySQL driver did not provide createConnection.");
  }
  return createConnection(connectionOptions());
}

async function runConnection<T>(handler: (conn: any) => Promise<T>) {
  const conn = await createDatabaseConnection();
  return handler(conn).finally(() => conn.end());
}

function mysqlCallback<T>(run: (done: (error: any, result?: T, fields?: any[]) => void) => void) {
  return new Promise<[T, any[]]>((resolve, reject) => {
    run((error, result, fields = []) => {
      if (error) reject(error);
      else resolve([result as T, fields]);
    });
  });
}

function wrapConnection(conn: any) {
  return {
    execute: (sql: string, params?: any[]) => mysqlCallback<any[]>((done) => conn.query(sql, params, done)),
    beginTransaction: () => mysqlCallback<any>((done) => conn.beginTransaction(done)).then(() => undefined),
    commit: () => mysqlCallback<any>((done) => conn.commit(done)).then(() => undefined),
    rollback: () => mysqlCallback<any>((done) => conn.rollback(done)).then(() => undefined),
    release: () => conn.end(),
  };
}

export async function getPool() {
  return {
    execute: (sql: string, params?: any[]) => runConnection((conn) => mysqlCallback<any[]>((done) => conn.query(sql, params, done))),
    getConnection: async () => wrapConnection(await createDatabaseConnection()),
    end: async () => {},
  };
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const pool = await getPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params?: any[]): Promise<any> {
  const pool = await getPool();
  const [result] = await pool.execute(sql, params);
  return result;
}

export async function insert(table: string, data: Record<string, any>): Promise<string> {
  const id = data.id || crypto.randomUUID();
  const row = { id, ...data };
  const keys = Object.keys(row);
  const values = Object.values(row);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;
  await execute(sql, values);
  return id;
}

export async function insertMany(table: string, rows: Record<string, any>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const firstRow = rows[0];
  const keys = Object.keys(firstRow);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;
  const pool = await getPool();
  let inserted = 0;
  for (const row of rows) {
    const values = keys.map(k => (row as any)[k]);
    await pool.execute(sql, values);
    inserted++;
  }
  return inserted;
}

export async function update(table: string, data: Record<string, any>, where: string, whereParams: any[]): Promise<number> {
  const keys = Object.keys(data).filter(k => k !== 'id');
  const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
  const values = [...keys.map(k => (data as any)[k]), ...whereParams];
  const sql = `UPDATE \`${table}\` SET ${setClause} WHERE ${where}`;
  const result = await execute(sql, values);
  return result.affectedRows;
}

export async function remove(table: string, where: string, whereParams: any[]): Promise<number> {
  const sql = `DELETE FROM \`${table}\` WHERE ${where}`;
  const result = await execute(sql, whereParams);
  return result.affectedRows;
}

export async function count(table: string, where?: string, whereParams?: any[]): Promise<number> {
  const sql = where
    ? `SELECT COUNT(*) as cnt FROM \`${table}\` WHERE ${where}`
    : `SELECT COUNT(*) as cnt FROM \`${table}\``;
  const rows = await query<{ cnt: number }>(sql, whereParams);
  return rows[0]?.cnt || 0;
}

export async function closePool(): Promise<void> {
  return undefined;
}
