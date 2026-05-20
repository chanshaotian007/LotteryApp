import { createHash } from "node:crypto";

export function sourceHash(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function jsonSourceHash(payload: unknown): string {
  return sourceHash(JSON.stringify(payload));
}
