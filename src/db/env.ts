import { getRequest } from "@tanstack/react-start/server";

let cloudflareEnvFallback: Record<string, any> | undefined;

export function setCloudflareEnv(env: unknown) {
  if (env && typeof env === "object") cloudflareEnvFallback = env as Record<string, any>;
}

export function getCloudflareEnv(request?: Request): Record<string, any> | undefined {
  try {
    if (request && (request as any).runtime?.cloudflare?.env) {
      const requestEnv = (request as any).runtime.cloudflare.env;
      if (requestEnv && typeof requestEnv === "object") {
        return { ...cloudflareEnvFallback, ...requestEnv };
      }
    }
    const requestEnv = (getRequest() as any).runtime?.cloudflare?.env;
    if (requestEnv && typeof requestEnv === "object") {
      return { ...cloudflareEnvFallback, ...requestEnv };
    }
    return cloudflareEnvFallback;
  } catch {
    return cloudflareEnvFallback;
  }
}

export function getServerEnv(name: string, request?: Request): string | undefined {
  const runtimeEnv = getCloudflareEnv(request);
  const value = runtimeEnv?.[name];
  if (value !== undefined && value !== null && typeof value !== "object") return String(value);

  return (globalThis as any).process?.env?.[name] ?? (import.meta as any).env?.[name];
}
