import "@tanstack/react-start/server-only";
import { getCloudflareEnv, getServerEnv } from './env';

function requiredEnv(name: string, request?: Request): string {
  const value = getServerEnv(name, request);
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

function hyperdriveBinding(request?: Request): HyperdriveBinding | undefined {
  return getCloudflareEnv(request)?.HYPERDRIVE as HyperdriveBinding | undefined;
}

function connectionOptions(request?: Request) {
  const binding = hyperdriveBinding(request);
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
    host: requiredEnv('MYSQL_HOST', request),
    port: parseInt(getServerEnv('MYSQL_PORT', request) || '3306', 10),
    database: requiredEnv('MYSQL_DATABASE', request),
    user: requiredEnv('MYSQL_USER', request),
    password: requiredEnv('MYSQL_PASSWORD', request),
    charset: 'utf8mb4',
    timezone: '+00:00',
    dateStrings: true,
  };
}

type DatabaseConnection = {
  conn: any;
  usesCallbacks: boolean;
};

async function createDatabaseConnection(request?: Request): Promise<DatabaseConnection> {
  if (hyperdriveBinding(request)) {
    const driver = await import("cloudflare-mysql/cloudflare-mysql/index.js") as any;
    const createConnection = driver.createConnection ?? driver.default?.createConnection;
    if (typeof createConnection !== "function") {
      throw new Error("Cloudflare MySQL driver did not provide createConnection.");
    }
    return { conn: createConnection(connectionOptions(request)), usesCallbacks: true };
  }

  const { createConnection } = await import("mysql2/promise");
  return { conn: await createConnection(connectionOptions(request)), usesCallbacks: false };
}

async function runConnection<T>(handler: (connection: DatabaseConnection) => Promise<T>, request?: Request) {
  const connection = await createDatabaseConnection(request);
  return handler(connection).finally(() => connection.conn.end());
}

function mysqlCallback<T>(run: (done: (error: any, result?: T, fields?: any[]) => void) => void) {
  return new Promise<[T, any[]]>((resolve, reject) => {
    run((error, result, fields = []) => {
      if (error) reject(error);
      else resolve([result as T, fields]);
    });
  });
}

function executeConnection(connection: DatabaseConnection, sql: string, params?: any[]) {
  return connection.usesCallbacks
    ? mysqlCallback<any[]>((done) => connection.conn.query(sql, params, done))
    : connection.conn.query(sql, params);
}

function wrapConnection(connection: DatabaseConnection) {
  return {
    execute: (sql: string, params?: any[]) => executeConnection(connection, sql, params),
    beginTransaction: () => connection.usesCallbacks
      ? mysqlCallback<any>((done) => connection.conn.beginTransaction(done)).then(() => undefined)
      : connection.conn.beginTransaction(),
    commit: () => connection.usesCallbacks
      ? mysqlCallback<any>((done) => connection.conn.commit(done)).then(() => undefined)
      : connection.conn.commit(),
    rollback: () => connection.usesCallbacks
      ? mysqlCallback<any>((done) => connection.conn.rollback(done)).then(() => undefined)
      : connection.conn.rollback(),
    release: () => connection.conn.end(),
  };
}

export async function getPool(request?: Request) {
  return {
    execute: (sql: string, params?: any[]) => runConnection((connection) => executeConnection(connection, sql, params), request),
    getConnection: async () => wrapConnection(await createDatabaseConnection(request)),
    end: async () => {},
  };
}

export async function query<T = any>(sql: string, params?: any[], request?: Request): Promise<T[]> {
  const pool = getPool(request);
  const [rows] = await pool.execute(sql, params);
  return (Array.isArray(rows) ? rows : []).map((row) =>
    row && typeof row === "object" ? { ...row } : row,
  ) as T[];
}

export async function queryOne<T = any>(sql: string, params?: any[], request?: Request): Promise<T | null> {
  const rows = await query<T>(sql, params, request);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params?: any[], request?: Request): Promise<any> {
  const pool = getPool(request);
  const [result] = await pool.execute(sql, params);
  return result;
}

export async function insert(table: string, data: Record<string, any>, request?: Request): Promise<string> {
  const id = data.id || crypto.randomUUID();
  const row = { id, ...data };
  const keys = Object.keys(row);
  const values = Object.values(row);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;
  await execute(sql, values, request);
  return id;
}

export async function insertMany(table: string, rows: Record<string, any>[], request?: Request): Promise<number> {
  if (rows.length === 0) return 0;
  const firstRow = rows[0];
  const keys = Object.keys(firstRow);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;
  const pool = getPool(request);
  let inserted = 0;
  for (const row of rows) {
    const values = keys.map(k => (row as any)[k]);
    await pool.execute(sql, values);
    inserted++;
  }
  return inserted;
}

export async function update(table: string, data: Record<string, any>, where: string, whereParams: any[], request?: Request): Promise<number> {
  const keys = Object.keys(data).filter(k => k !== 'id');
  const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
  const values = [...keys.map(k => (data as any)[k]), ...whereParams];
  const sql = `UPDATE \`${table}\` SET ${setClause} WHERE ${where}`;
  const result = await execute(sql, values, request);
  return result.affectedRows;
}

export async function remove(table: string, where: string, whereParams: any[], request?: Request): Promise<number> {
  const sql = `DELETE FROM \`${table}\` WHERE ${where}`;
  const result = await execute(sql, whereParams, request);
  return result.affectedRows;
}

export async function count(table: string, where?: string, whereParams?: any[], request?: Request): Promise<number> {
  const sql = where
    ? `SELECT COUNT(*) as cnt FROM \`${table}\` WHERE ${where}`
    : `SELECT COUNT(*) as cnt FROM \`${table}\``;
  const rows = await query<{ cnt: number }>(sql, whereParams, request);
  return rows[0]?.cnt || 0;
}

export async function closePool(): Promise<void> {
  return undefined;
}
