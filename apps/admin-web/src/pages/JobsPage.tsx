import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../api";

export function JobsPage() {
  const jobs = useQuery({
    queryKey: ["jobs"],
    queryFn: adminApi.listJobs,
  });

  return (
    <section>
      <h2>任务记录</h2>
      <div className="panel">
        {jobs.isLoading && <p>加载中...</p>}
        {jobs.error && <p>{String(jobs.error)}</p>}
        {jobs.data?.map((job) => (
          <article key={job.id} className="job">
            <strong>{job.jobType}</strong>
            <p>{job.status}</p>
            <p>{job.startedAt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
