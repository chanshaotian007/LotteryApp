import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../api";
export function JobsPage() {
    const jobs = useQuery({
        queryKey: ["jobs"],
        queryFn: adminApi.listJobs,
    });
    return (_jsxs("section", { children: [_jsx("h2", { children: "\u4EFB\u52A1\u8BB0\u5F55" }), _jsxs("div", { className: "panel", children: [jobs.isLoading && _jsx("p", { children: "\u52A0\u8F7D\u4E2D..." }), jobs.error && _jsx("p", { children: String(jobs.error) }), jobs.data?.map((job) => (_jsxs("article", { className: "job", children: [_jsx("strong", { children: job.jobType }), _jsx("p", { children: job.status }), _jsx("p", { children: job.startedAt })] }, job.id)))] })] }));
}
//# sourceMappingURL=JobsPage.js.map