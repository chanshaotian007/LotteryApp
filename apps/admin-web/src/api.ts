const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export function getAdminToken(): string {
  return localStorage.getItem("lottery_admin_token") ?? "";
}

export function setAdminToken(token: string): void {
  localStorage.setItem("lottery_admin_token", token);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAdminToken()}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
}

export const adminApi = {
  listJobs: () => request<any[]>("/api/admin/v1/jobs"),
  listOrders: () => request<any[]>("/api/admin/v1/orders"),
  sync: (payload: { gameCode: string; limit: number }) =>
    request<any>("/api/admin/v1/sync", { method: "POST", body: JSON.stringify(payload) }),
  train: (payload: { gameCode: string; rollingWindow: number; trainingWindow: number; minTrainingSamples: number; randomSeed: number }) =>
    request<any>("/api/admin/v1/train", { method: "POST", body: JSON.stringify(payload) }),
  grantEntitlement: (payload: { openId: string; durationDays: number; productCode?: string }) =>
    request<any>("/api/admin/v1/entitlements/grant", { method: "POST", body: JSON.stringify(payload) }),
};
