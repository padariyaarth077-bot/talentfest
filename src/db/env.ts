import { getRequest } from "@tanstack/react-start/server";

let cloudflareEnvFallback: Record<string, any> | undefined;

export function setCloudflareEnv(env: unknown) {
  if (env && typeof env === "object") cloudflareEnvFallback = env as Record<string, any>;
}

export function getCloudflareEnv(): Record<string, any> | undefined {
  try {
    return (getRequest() as any).runtime?.cloudflare?.env ?? cloudflareEnvFallback;
  } catch {
    return cloudflareEnvFallback;
  }
}

export function getServerEnv(name: string): string | undefined {
  const runtimeEnv = getCloudflareEnv();
  const value = runtimeEnv?.[name];
  if (value !== undefined && value !== null && typeof value !== "object") return String(value);

  return (globalThis as any).process?.env?.[name] ?? (import.meta as any).env?.[name];
}
