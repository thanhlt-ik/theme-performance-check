import { DeviceType } from '@prisma/client';

export type JobItemStatus = 'pending' | 'running' | 'done' | 'failed';

export interface JobProgressItem {
  productId: string;
  product: string;
  deviceType: DeviceType;
  status: JobItemStatus;
  score?: number;
  error?: string;
}

export interface JobProgressSnapshot {
  jobId: string;
  status: 'running' | 'completed';
  totalItems: number;
  completedItems: number;
  failedItems: number;
  startedAt: string;
  // Bumped on every write while the job runs — lets a reader tell "still
  // actively progressing" apart from "abandoned mid-run and nobody will
  // ever finish it" (e.g. the process that ran it was killed).
  updatedAt: string;
  finishedAt?: string;
  items: JobProgressItem[];
}

export interface JobHistoryEntry {
  jobId: string;
  status: 'running' | 'completed';
  totalItems: number;
  completedItems: number;
  failedItems: number;
  startedAt: string;
  finishedAt?: string;
}
