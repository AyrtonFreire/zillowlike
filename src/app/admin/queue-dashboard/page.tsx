"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type QueueStats = {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
};

type Job = {
  id: string;
  name: string;
  data: any;
  progress: number;
  attemptsMade: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
};

export default function QueueDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobType, setJobType] = useState<"waiting" | "active" | "completed" | "failed">("waiting");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check admin role
  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session as any).user?.role !== "ADMIN") {
      router.push("/unauthorized");
    }
  }, [session, status, router]);

  // Fetch queue stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/queue/stats");
        if (!res.ok) throw new Error("Failed to fetch queue stats");
        const data = await res.json();
        setQueues(data.queues || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Fetch jobs for selected queue
  useEffect(() => {
    if (!selectedQueue) return;

    const fetchJobs = async () => {
      try {
        const res = await fetch(`/api/admin/queue/jobs?queue=${selectedQueue}&type=${jobType}`);
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (err: any) {
        console.error("Failed to fetch jobs:", err);
      }
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, [selectedQueue, jobType]);

  const handleRetryJob = async (jobId: string) => {
    if (!selectedQueue) return;
    try {
      const res = await fetch("/api/admin/queue/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue: selectedQueue, jobId }),
      });
      if (!res.ok) throw new Error("Failed to retry job");
      alert("Job retried successfully");
    } catch (err: any) {
      alert(`Failed to retry: ${err.message}`);
    }
  };

  const handleRemoveJob = async (jobId: string) => {
    if (!selectedQueue) return;
    if (!confirm("Are you sure you want to remove this job?")) return;
    try {
      const res = await fetch("/api/admin/queue/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue: selectedQueue, jobId }),
      });
      if (!res.ok) throw new Error("Failed to remove job");
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err: any) {
      alert(`Failed to remove: ${err.message}`);
    }
  };

  const handlePauseQueue = async (queueName: string) => {
    try {
      const res = await fetch("/api/admin/queue/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue: queueName }),
      });
      if (!res.ok) throw new Error("Failed to pause queue");
      alert("Queue paused");
    } catch (err: any) {
      alert(`Failed to pause: ${err.message}`);
    }
  };

  const handleResumeQueue = async (queueName: string) => {
    try {
      const res = await fetch("/api/admin/queue/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue: queueName }),
      });
      if (!res.ok) throw new Error("Failed to resume queue");
      alert("Queue resumed");
    } catch (err: any) {
      alert(`Failed to resume: ${err.message}`);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Error</h2>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Queue Dashboard</h1>

        {/* Queue Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {queues.map((queue) => (
            <div
              key={queue.name}
              className={`bg-white rounded-lg shadow p-6 cursor-pointer transition ${
                selectedQueue === queue.name ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => setSelectedQueue(queue.name)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{queue.name}</h3>
                {queue.paused && (
                  <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                    Paused
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Waiting</p>
                  <p className="text-2xl font-bold text-gray-900">{queue.waiting}</p>
                </div>
                <div>
                  <p className="text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-blue-600">{queue.active}</p>
                </div>
                <div>
                  <p className="text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{queue.completed}</p>
                </div>
                <div>
                  <p className="text-gray-500">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{queue.failed}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {queue.paused ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResumeQueue(queue.name);
                    }}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePauseQueue(queue.name);
                    }}
                    className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    Pause
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Job List */}
        {selectedQueue && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Jobs in {selectedQueue}
              </h2>
              <div className="flex gap-2">
                {(["waiting", "active", "completed", "failed"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setJobType(type)}
                    className={`px-4 py-2 rounded ${
                      jobType === type
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y">
              {jobs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No {jobType} jobs</div>
              ) : (
                jobs.map((job) => (
                  <div key={job.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{job.name}</h3>
                          <span className="text-xs text-gray-500">#{job.id.slice(0, 8)}</span>
                        </div>
                        <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(job.data, null, 2)}
                        </pre>
                        {job.failedReason && (
                          <p className="mt-2 text-sm text-red-600">Error: {job.failedReason}</p>
                        )}
                        <div className="mt-2 text-xs text-gray-500">
                          Attempts: {job.attemptsMade} | Progress: {job.progress}%
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {jobType === "failed" && (
                          <button
                            onClick={() => handleRetryJob(job.id)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Retry
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveJob(job.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
