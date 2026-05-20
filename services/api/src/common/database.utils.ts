import { GameCode, type DrawRecord } from "@lottery/contracts";
import { Prisma } from "@prisma/client";

export function normalizeIssueSort(issue: string): string {
  return issue.padStart(16, "0");
}

export function drawCount(draws: DrawRecord[]): number {
  return draws.length;
}

export function latestIssue(draws: DrawRecord[]): string | null {
  return draws[0]?.issue ?? null;
}

export function buildDataVersion(gameCode: GameCode, draws: DrawRecord[]): string {
  return `${gameCode}:${latestIssue(draws) ?? "empty"}:${drawCount(draws)}`;
}

export function toDateOrNull(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateString(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}

export function jsonNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => Number(item));
}

export function jsonObjectArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => (typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {}));
}

export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function toNullableJsonValue(
  value: unknown | null | undefined,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return Prisma.JsonNull;
  }
  return toJsonValue(value);
}
