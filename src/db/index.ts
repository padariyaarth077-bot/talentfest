import mysql from 'mysql2/promise';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const DB_HOST = requiredEnv('MYSQL_HOST');
const DB_PORT = parseInt(process.env.MYSQL_PORT || '3306', 10);
const DB_NAME = requiredEnv('MYSQL_DATABASE');
const DB_USER = requiredEnv('MYSQL_USER');
const DB_PASS = requiredEnv('MYSQL_PASSWORD');

let _pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!_pool) {
    _pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASS,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: '+00:00',
      dateStrings: true,
    });
  }
  return _pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
  const pool = getPool();
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
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
  const pool = getPool();
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
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
