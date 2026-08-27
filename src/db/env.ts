import { getRequest } from "@tanstack/react-start/server";

export function getServerEnv(name: string): string | undefined {
  try {
    const runtimeEnv = (getRequest() as any).runtime?.cloudflare?.env;
    const value = runtimeEnv?.[name];
    if (value !== undefined && value !== null) return String(value);
  } catch {
    // Outside a request, fall back to the local Node/Vite environment.
  }

  return (globalThis as any).process?.env?.[name] ?? (import.meta as any).env?.[name];
}

