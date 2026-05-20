import { ComplexPreference, GameCode, GenerateMode } from "@lottery/contracts";
import { getSession } from "./session";

const serviceName = "lottery-api";

interface ContainerResponse<T> {
  data: T;
}

async function callContainer<T>(path: string, method: "GET" | "POST", data?: Record<string, unknown>): Promise<T> {
  const session = getSession();
  const response = await wx.cloud.callContainer({
    config: {
      env: "",
    },
    path,
    method,
    header: {
      Authorization: session ? `Bearer ${session.token}` : "",
    },
    data,
    service: serviceName,
  });
  return (response as unknown as ContainerResponse<T>).data;
}

export interface GenerateFormState {
  gameCode: GameCode;
  mode: GenerateMode;
  count: number;
  budgetMin?: number | null;
  budgetMax?: number | null;
  complexPreference: ComplexPreference;
  excludeHighPrizeHistory: boolean;
  targetPrizeMode: boolean;
}

export function generate(payload: GenerateFormState) {
  return callContainer<any>("/api/v1/generate", "POST", payload as unknown as Record<string, unknown>);
}

export function getGames() {
  return callContainer<any[]>("/api/v1/games", "GET");
}

export function getDraws(gameCode: GameCode, limit = 20) {
  return callContainer<any[]>(`/api/v1/draws?gameCode=${gameCode}&limit=${limit}`, "GET");
}

export function getStats(gameCode: GameCode) {
  return callContainer<any>(`/api/v1/stats?gameCode=${gameCode}`, "GET");
}

export function getMembership() {
  return callContainer<any>("/api/v1/memberships/me", "GET");
}

export function createPrepay(productCode: string) {
  return callContainer<any>("/api/v1/payments/prepay", "POST", { productCode });
}

export function listOrders() {
  return callContainer<any[]>("/api/v1/orders", "GET");
}

export function getProfile() {
  return callContainer<any>("/api/v1/profile/me", "GET");
}
