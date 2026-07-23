'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { JobProgressSnapshot } from '@/lib/types/job-progress';

interface JobProgressContextValue {
  jobId: string | null;
  snapshot: JobProgressSnapshot | null;
  startJob: (jobId: string) => void;
}

const JobProgressContext = createContext<JobProgressContextValue | null>(null);

const DISPLAY_POLL_INTERVAL_MS = 4000;

export function JobProgressProvider({ children }: { children: React.ReactNode }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<JobProgressSnapshot | null>(null);
  const displayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Display polling — read-only and fast, independent of however long a
  // measurement chunk takes to run, so the panel shows up and updates
  // promptly instead of waiting on the driver loop below.
  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    const pollDisplay = async () => {
      try {
        const res = await fetch(`/api/cron/measurements/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setSnapshot(data.progress ?? null);
          if (!cancelled && data.progress?.status === 'running') {
            displayTimer.current = setTimeout(pollDisplay, DISPLAY_POLL_INTERVAL_MS);
          }
        }
      } catch {
        if (!cancelled) displayTimer.current = setTimeout(pollDisplay, DISPLAY_POLL_INTERVAL_MS);
      }
    };

    pollDisplay();

    return () => {
      cancelled = true;
      if (displayTimer.current) clearTimeout(displayTimer.current);
    };
  }, [jobId]);

  // Driver — each call only advances one product's worth of measurements,
  // so a job needs this called repeatedly to finish. The external cron
  // supplies that cadence for unattended runs, but a human watching the
  // panel shouldn't have to wait on a multi-minute cron interval: keep
  // firing the next chunk back-to-back (never overlapping — each call is
  // awaited before the next starts) for as long as this tab has the job in
  // view.
  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    const drive = async () => {
      while (!cancelled) {
        try {
          const res = await fetch('/api/dashboard/trigger-measurement', { method: 'POST' });
          const data = res.ok ? await res.json() : null;
          if (!data || data.status !== 'running') break;
        } catch {
          if (cancelled) break;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    };

    drive();

    return () => {
      cancelled = true;
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
