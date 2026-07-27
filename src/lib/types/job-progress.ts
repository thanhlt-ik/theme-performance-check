import { DeviceType } from '@prisma/client';

export type JobItemStatus = 'pending' | 'running' | 'done' | 'failed';

// How many times an item may be automatically requeued (after failing, or
// after being found stuck "running") before it's left at 'failed' for good.
export const MAX_ITEM_RETRIES = 2;

export interface JobProgressItem {
  productId: string;
  product: string;
  deviceType: DeviceType;
  status: JobItemStatus;
  score?: number;
  error?: string;
  // Number of times this item has been automatically requeued after
  // failing (or after being stuck "running" too long). Capped so a
  // permanently-broken item eventually settles at 'failed' instead of
  // looping forever.
  retryCount?: number;
  // Timestamp of the item's last status change — lets a reader tell a
  // genuinely in-progress "running" item apart from one whose driver died
  // mid-measurement and will never update it again.
  updatedAt?: string;
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
