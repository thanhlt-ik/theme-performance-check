'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { JobProgressSnapshot } from '@/lib/types/job-progress';

interface JobProgressContextValue {
  jobId: string | null;
  snapshot: JobProgressSnapshot | null;
  startJob: (jobId: string) => void;
}

const JobProgressContext = createContext<JobProgressContextValue | null>(null);

const POLL_INTERVAL_MS = 4000;

export function JobProgressProvider({ children }: { children: React.ReactNode }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<JobProgressSnapshot | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Discover an already-running job once on mount, so the panel survives page reloads.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/cron/measurements/active')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.jobId) {
          setJobId(data.jobId);
          setSnapshot(data.progress ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/cron/measurements/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setSnapshot(data.progress ?? null);
          if (!cancelled && data.progress?.status === 'running') {
            pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
          }
        }
      } catch {
        // Network hiccup — try again on the next interval instead of giving up.
        if (!cancelled) pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [jobId]);

  const startJob = useCallback((id: string) => {
    setJobId(id);
    setSnapshot(null);
  }, []);

  return (
    <JobProgressContext.Provider value={{ jobId, snapshot, startJob }}>
      {children}
    </JobProgressContext.Provider>
  );
}

export function useJobProgress(): JobProgressContextValue {
  const ctx = useContext(JobProgressContext);
  if (!ctx) {
    throw new Error('useJobProgress must be used within a JobProgressProvider');
  }
  return ctx;
}
