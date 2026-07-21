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
