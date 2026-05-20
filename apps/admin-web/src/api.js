const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
export function getAdminToken() {
    return localStorage.getItem("lottery_admin_token") ?? "";
}
export function setAdminToken(token) {
    localStorage.setItem("lottery_admin_token", token);
}
async function request(path, options) {
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
    return (await response.json());
}
export const adminApi = {
    listJobs: () => request("/api/admin/v1/jobs"),
    listOrders: () => request("/api/admin/v1/orders"),
    sync: (payload) => request("/api/admin/v1/sync", { method: "POST", body: JSON.stringify(payload) }),
    train: (payload) => request("/api/admin/v1/train", { method: "POST", body: JSON.stringify(payload) }),
    grantEntitlement: (payload) => request("/api/admin/v1/entitlements/grant", { method: "POST", body: JSON.stringify(payload) }),
};
//# sourceMappingURL=api.js.map