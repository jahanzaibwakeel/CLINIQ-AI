import { randomUUID } from "crypto";

export function requestIdFrom(request?: Request) {
  return request?.headers.get("x-request-id") ?? randomUUID();
}

export function estimateTokens(...parts: Array<string | undefined>) {
  const characters = parts.reduce((total, part) => total + (part?.length ?? 0), 0);
  return Math.max(1, Math.ceil(characters / 4));
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
