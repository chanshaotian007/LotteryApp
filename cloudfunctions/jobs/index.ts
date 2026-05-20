interface JobEvent {
  action: "sync" | "train" | "reconcile" | "healthcheck";
  payload?: Record<string, unknown>;
}

const actionPathMap: Record<JobEvent["action"], string> = {
  sync: "/api/internal/v1/jobs/sync",
  train: "/api/internal/v1/jobs/train",
  reconcile: "/api/internal/v1/jobs/reconcile",
  healthcheck: "/api/internal/v1/jobs/healthcheck",
};

export async function main(event: JobEvent): Promise<Record<string, unknown>> {
  const baseUrl = process.env.INTERNAL_API_BASE_URL;
  const jobSecret = process.env.JOB_SHARED_SECRET;
  if (!baseUrl || !jobSecret) {
    throw new Error("INTERNAL_API_BASE_URL and JOB_SHARED_SECRET are required");
  }
  const path = actionPathMap[event.action];
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Job-Secret": jobSecret,
    },
    body: JSON.stringify(event.payload ?? {}),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`job request failed: ${response.status} ${text}`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}
