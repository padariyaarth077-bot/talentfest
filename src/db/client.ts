import { createServerFn } from "@tanstack/react-start";
import type { QueryPayload } from "./data-client.server";

const runDbQuery = createServerFn({ method: "POST" })
  .validator((data: QueryPayload) => data)
  .handler(async ({ data }) => {
    const { runQuery } = await import("./data-client.server");
    return runQuery(data);
  });

const runRpc = createServerFn({ method: "POST" })
  .validator((data: { name: string; args: Record<string, any> }) => data)
  .handler(async ({ data }) => {
    const { callRpc } = await import("./rpc");
    try {
      return { data: await callRpc(data.name, data.args), error: null };
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : String(error) } };
    }
  });

const uploadFile = createServerFn({ method: "POST" })
  .validator((data: { bucket: string; path: string; base64: string }) => data)
  .handler(async ({ data }) => {
    const { uploadObject } = await import("./storage");
    const saved = await uploadObject(data.bucket, data.path, Buffer.from(data.base64, "base64"));
    return { data: { path: saved.path }, error: null };
  });

const login = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; adminOnly?: boolean }) => data)
  .handler(async ({ data }) => {
    const { signIn } = await import("./auth");
    return signIn(data.email, data.password, data.adminOnly);
  });

const signup = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; fullName: string; phone?: string }) => data)
  .handler(async ({ data }) => {
    const { signUp } = await import("./auth");
    return signUp(data.email, data.password, data.fullName, data.phone);
  });

const logout = createServerFn({ method: "POST" })
  .handler(async () => {
    const { signOut } = await import("./auth");
    return signOut();
  });

const getUser = createServerFn({ method: "GET" })
  .handler(async () => {
    const { currentUser } = await import("./auth");
    return { user: await currentUser() };
  });

export function getDbConfigError() {
  return "";
}

export function isDbConfigured() {
  return true;
}

class RemoteQuery implements PromiseLike<any> {
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
  insert(values: any) { this.payload.operation = "insert"; this.payload.values = values; return this; }
  update(values: any) { this.payload.operation = "update"; this.payload.values = values; return this; }
  delete() { this.payload.operation = "delete"; return this; }
  eq(column: string, value: any) { this.payload.filters!.push({ column, op: "=", value }); return this; }
  neq(column: string, value: any) { this.payload.filters!.push({ column, op: "!=", value }); return this; }
  gte(column: string, value: any) { this.payload.filters!.push({ column, op: ">=", value }); return this; }
  lte(column: string, value: any) { this.payload.filters!.push({ column, op: "<=", value }); return this; }
  ilike(column: string, value: any) { this.payload.filters!.push({ column, op: "like", value: String(value).replace(/\*/g, "%") }); return this; }
  in(column: string, value: any[]) { this.payload.filters!.push({ column, op: "in", value }); return this; }
  or(value: string) { this.payload.or = value; return this; }
  order(column: string, options?: { ascending?: boolean }) { this.payload.orders!.push({ column, ascending: options?.ascending !== false }); return this; }
  limit(value: number) { this.payload.limit = value; return this; }
  range(from: number, to: number) { this.payload.range = [from, to]; return this; }
  single() { this.payload.single = "single"; return this; }
  maybeSingle() { this.payload.single = "maybeSingle"; return this; }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return runDbQuery({ data: this.payload }).then(onfulfilled, onrejected);
  }
}

async function fileToBase64(file: Blob) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export const db = {
  from: (table: string) => new RemoteQuery(table),
  rpc: (name: string, args: Record<string, any>) => runRpc({ data: { name, args } }),
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const data = await login({ data: { email, password } });
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      try {
        const data = await signup({
          data: {
            email,
            password,
            fullName: options?.data?.full_name ?? "",
            phone: options?.data?.phone ?? "",
          },
        });
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    getUser: async () => ({ data: await getUser(), error: null }),
    getSession: async () => {
      const data = await getUser();
      return { data: { session: data.user ? { user: data.user } : null }, error: null };
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ data: await logout(), error: null }),
    resetPasswordForEmail: async () => ({ data: null, error: new Error("Password reset is not configured.") }),
  },
  storage: {
    from: (bucket: string) => ({
      getPublicUrl: (path: string) => ({ data: { publicUrl: `/uploads/${bucket}/${path}` } }),
      createSignedUrl: async (path: string) => ({ data: { signedUrl: `/uploads/${bucket}/${path}` }, error: null }),
      upload: async (path: string, file: Blob) => uploadFile({ data: { bucket, path, base64: await fileToBase64(file) } }),
    }),
  },
};

