import { CronManagement } from '@/components/dashboard/cron-management';
import { JobHistory } from '@/components/dashboard/job-history';
import { NoSSR } from '@/components/no-ssr';

export default function JobsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 sm:p-8 sm:pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Scheduled Jobs</h2>

      <NoSSR
        fallback={
          <div className="flex flex-col gap-4 max-w-[900px]">
            <div className="h-[130px] w-full rounded-[10px] border border-border bg-muted animate-pulse" />
            <div className="h-[220px] w-full rounded-[10px] border border-border bg-muted animate-pulse" />
          </div>
        }
      >
        <div className="flex flex-col gap-4 max-w-[900px]">
          <CronManagement />
          <JobHistory />
        </div>
      </NoSSR>
    </div>
  );
}
