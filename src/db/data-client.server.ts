import "@tanstack/react-start/server-only";
import { execute, query, queryOne } from "./index";
import { callRpc } from "./rpc";
import { getPublicUrl, uploadObject } from "./storage";

type Filter = { column: string; op: "=" | "!=" | ">=" | "<=" | "in" | "like"; value: any };
type Order = { column: string; ascending: boolean };
type Operation = "select" | "insert" | "update" | "delete";

export type QueryPayload = {
  table: string;
  operation: Operation;
  columns?: string;
  values?: any;
  filters?: Filter[];
  or?: string;
  orders?: Order[];
  limit?: number;
  range?: [number, number];
  single?: "single" | "maybeSingle";
  count?: "exact";
  head?: boolean;
};

function id(name: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error(`Invalid identifier: ${name}`);
  return `\`${name}\``;
}

function splitColumns(input = "*") {
  const cols: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of input) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      cols.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) cols.push(current.trim());
  return cols;
}

function selectClause(columns = "*") {
  if (!columns || columns.trim() === "*") return "*";
  const base = splitColumns(columns)
    .filter((col) => col && !col.includes("(") && !col.includes("!"))
    .map((col) => col.trim());
  return base.length ? base.map(id).join(", ") : "*";
}

function cleanValue(value: any) {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value) || (value && typeof value === "object" && !(value instanceof Date))) {
    return JSON.stringify(value);
  }
  return value;
}

function normalizeRow(row: any) {
  if (!row || typeof row !== "object") return row;
  for (const [key, value] of Object.entries(row)) {
    if (
      typeof value === "number" &&
      (key.startsWith("is_") || key === "checked_in" || key === "email_confirmed" || key.endsWith("_accepted"))
    ) {
      row[key] = Boolean(value);
    }
    if (typeof value === "string" && (key.endsWith("_categories") || key === "award_categories")) {
      try {
        row[key] = JSON.parse(value);
      } catch {
        // keep raw value
      }
    }
  }
  return row;
}

function appendFilters(parts: string[], params: any[], filters: Filter[] = []) {
  for (const filter of filters) {
    const column = id(filter.column);
    if (filter.op === "in") {
      const values = Array.isArray(filter.value) ? filter.value : [];
      if (!values.length) {
        parts.push("1 = 0");
      } else {
        parts.push(`${column} IN (${values.map(() => "?").join(", ")})`);
        params.push(...values);
      }
    } else if (filter.op === "like") {
      parts.push(`${column} LIKE ?`);
      params.push(filter.value);
    } else {
      parts.push(`${column} ${filter.op} ?`);
      params.push(filter.value);
    }
  }
}

function appendOr(parts: string[], params: any[], or?: string) {
  if (!or) return;
  const clauses: string[] = [];
  for (const item of or.split(",")) {
    const [column, op, ...rest] = item.split(".");
    if (op !== "eq" || !column || rest.length === 0) continue;
    clauses.push(`${id(column)} = ?`);
    params.push(rest.join("."));
  }
  if (clauses.length) parts.push(`(${clauses.join(" OR ")})`);
}

function whereSql(payload: QueryPayload) {
  const parts: string[] = [];
  const params: any[] = [];
  appendFilters(parts, params, payload.filters);
  appendOr(parts, params, payload.or);
  return { sql: parts.length ? ` WHERE ${parts.join(" AND ")}` : "", params };
}

function orderLimitSql(payload: QueryPayload) {
  const order = (payload.orders ?? [])
    .map((entry) => `${id(entry.column)} ${entry.ascending ? "ASC" : "DESC"}`)
    .join(", ");
  const orderSql = order ? ` ORDER BY ${order}` : "";
  if (payload.range) {
    const [from, to] = payload.range;
    return `${orderSql} LIMIT ${Math.max(0, to - from + 1)} OFFSET ${Math.max(0, from)}`;
  }
  return payload.limit ? `${orderSql} LIMIT ${payload.limit}` : orderSql;
}

async function insertRows(payload: QueryPayload) {
  const rows = Array.isArray(payload.values) ? payload.values : [payload.values ?? {}];
  const ids: string[] = [];
  for (const raw of rows) {
    const row = withGeneratedDefaults(payload.table, raw);
    const keys = Object.keys(row).filter((key) => row[key] !== undefined);
    const sql = `INSERT INTO ${id(payload.table)} (${keys.map(id).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
    await execute(sql, keys.map((key) => cleanValue(row[key])));
    ids.push(row.id);
  }
  if (!payload.columns) return { data: null, error: null };
  const data = await query(`SELECT ${selectClause(payload.columns)} FROM ${id(payload.table)} WHERE id IN (${ids.map(() => "?").join(", ")})`, ids);
  return finishRows(payload, data);
}

function withGeneratedDefaults(table: string, raw: Record<string, any>) {
  const row = { ...raw };
  row.id ||= crypto.randomUUID();
  if (table === "public_entry_passes") {
    row.entry_number ||= `TF${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
    row.qr_value ||= JSON.stringify({ id: row.id, entryNumber: row.entry_number });
  }
  if (table === "employee_award_registrations") {
    row.application_number ||= `EAC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    row.submitted_at ||= new Date().toISOString();
  }
  if (table === "passes") {
    row.pass_number ||= `TFP-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
    row.secure_qr_token ||= crypto.randomUUID();
    row.generated_at ||= new Date().toISOString();
  }
  return row;
}

async function updateRows(payload: QueryPayload) {
  const values = payload.values ?? {};
  const keys = Object.keys(values).filter((key) => values[key] !== undefined);
  const where = whereSql(payload);
  if (!keys.length) return { data: null, error: null };
  await execute(
    `UPDATE ${id(payload.table)} SET ${keys.map((key) => `${id(key)} = ?`).join(", ")}${where.sql}`,
    [...keys.map((key) => cleanValue(values[key])), ...where.params],
  );
  if (!payload.columns) return { data: null, error: null };
  const rows = await query(`SELECT ${selectClause(payload.columns)} FROM ${id(payload.table)}${where.sql}${orderLimitSql(payload)}`, where.params);
  return finishRows(payload, rows);
}

async function deleteRows(payload: QueryPayload) {
  const where = whereSql(payload);
  await execute(`DELETE FROM ${id(payload.table)}${where.sql}`, where.params);
  return { data: null, error: null };
}

async function selectRows(payload: QueryPayload) {
  const where = whereSql(payload);
  if (payload.count && payload.head) {
    const row = await queryOne<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM ${id(payload.table)}${where.sql}`, where.params);
    return { data: null, count: row?.cnt ?? 0, error: null };
  }
  const rows = await query(
    `SELECT ${selectClause(payload.columns)} FROM ${id(payload.table)}${where.sql}${orderLimitSql(payload)}`,
    where.params,
  );
  return finishRows(payload, await hydrate(payload.table, rows.map(normalizeRow), payload.columns || "*"));
}

async function finishRows(payload: QueryPayload, rows: any[]) {
  const normalized = rows.map(normalizeRow);
  if (payload.single === "single") {
    if (normalized.length !== 1) return { data: null, error: { message: "Expected a single row." } };
    return { data: normalized[0], error: null };
  }
  if (payload.single === "maybeSingle") {
    return { data: normalized[0] ?? null, error: null };
  }
  return { data: normalized, error: null };
}

async function hydrate(table: string, rows: any[], columns: string) {
  if (!rows.length) return rows;
  if (table === "event_activity_categories" && columns.includes("activity_categories")) {
    const ids = [...new Set(rows.map((row) => row.activity_category_id).filter(Boolean))];
    const cats = ids.length
      ? await query(`SELECT * FROM activity_categories WHERE id IN (${ids.map(() => "?").join(", ")})`, ids)
      : [];
    const byId = new Map(cats.map((row: any) => [row.id, normalizeRow(row)]));
    rows.forEach((row) => (row.activity_categories = byId.get(row.activity_category_id) ?? null));
  }
  if (table === "seat_bookings" && columns.includes("event_seats")) {
    const seatIds = [...new Set(rows.map((row) => row.seat_id).filter(Boolean))];
    const seats = seatIds.length
      ? await query(
          `SELECT s.*, sec.section_name, sec.section_code
           FROM event_seats s
           LEFT JOIN event_seat_sections sec ON sec.id = s.section_id
           WHERE s.id IN (${seatIds.map(() => "?").join(", ")})`,
          seatIds,
        )
      : [];
    const byId = new Map(seats.map((seat: any) => [seat.id, seat]));
    rows.forEach((row) => {
      const seat: any = byId.get(row.seat_id);
      row.event_seats = seat
        ? {
            id: seat.id,
            seat_label: seat.seat_label,
            row_label: seat.row_label,
            seat_number: seat.seat_number,
            event_seat_sections: {
              section_name: seat.section_name,
              section_code: seat.section_code,
            },
          }
        : null;
    });
  }
  if (table === "seat_allocation_audit" && columns.includes("event_seats")) {
    const seatIds = [...new Set(rows.map((row) => row.new_seat_id).filter(Boolean))];
    const seats = seatIds.length
      ? await query(`SELECT id, seat_label FROM event_seats WHERE id IN (${seatIds.map(() => "?").join(", ")})`, seatIds)
      : [];
    const byId = new Map(seats.map((seat: any) => [seat.id, seat]));
    rows.forEach((row) => (row.event_seats = byId.get(row.new_seat_id) ?? null));
  }
  return rows;
}

export async function runQuery(payload: QueryPayload) {
  try {
    if (payload.operation === "insert") return await insertRows(payload);
    if (payload.operation === "update") return await updateRows(payload);
    if (payload.operation === "delete") return await deleteRows(payload);
    return await selectRows(payload);
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : String(error) } };
  }
}

export function createDbAdmin() {
  return {
    from: (table: string) => new ServerQuery(table),
    rpc: async (name: string, args: Record<string, any>) => {
      try {
        return { data: await callRpc(name, args), error: null };
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : String(error) } };
      }
    },
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (objectPath: string) => ({ data: { publicUrl: getPublicUrl(bucket, objectPath) } }),
        createSignedUrl: async (objectPath: string) => ({ data: { signedUrl: getPublicUrl(bucket, objectPath) }, error: null }),
        upload: async (objectPath: string, file: Blob | Buffer) => {
          const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
          const saved = await uploadObject(bucket, objectPath, buffer);
          return { data: { path: saved.path }, error: null };
        },
      }),
    },
  };
}

class ServerQuery implements PromiseLike<any> {
  private payload: QueryPayload;

  constructor(table: string) {
    this.payload = { table, operation: "select", filters: [], orders: [] };
  }

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.payload.operation = "select";
    this.payload.columns = columns || "*";
    this.payload.count = options?.count;
    this.payload.head = options?.head;
    return this;
  }

  insert(values: any) {
    this.payload.operation = "insert";
    this.payload.values = values;
    return this;
  }

  update(values: any) {
    this.payload.operation = "update";
    this.payload.values = values;
    return this;
  }

  delete() {
    this.payload.operation = "delete";
    return this;
  }

  eq(column: string, value: any) { this.payload.filters!.push({ column, op: "=", value }); return this; }
  neq(column: string, value: any) { this.payload.filters!.push({ column, op: "!=", value }); return this; }
  gte(column: string, value: any) { this.payload.filters!.push({ column, op: ">=", value }); return this; }
  lte(column: string, value: any) { this.payload.filters!.push({ column, op: "<=", value }); return this; }
  ilike(column: string, value: any) { this.payload.filters!.push({ column, op: "like", value: String(value).replace(/\*/g, "%") }); return this; }
  in(column: string, value: any[]) { this.payload.filters!.push({ column, op: "in", value }); return this; }
  or(value: string) { this.payload.or = value; return this; }
  order(column: string, options?: { ascending?: boolean }) {
    this.payload.orders!.push({ column, ascending: options?.ascending !== false });
    return this;
  }
  limit(value: number) { this.payload.limit = value; return this; }
  range(from: number, to: number) { this.payload.range = [from, to]; return this; }
  single() { this.payload.single = "single"; return this; }
  maybeSingle() { this.payload.single = "maybeSingle"; return this; }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return runQuery(this.payload).then(onfulfilled, onrejected);
  }
}

export const dbAdmin = createDbAdmin();
