import { ExportForm } from '@/components/export/export-form';

export default function ExportPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 sm:p-8 sm:pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Export Data</h2>
      <ExportForm className="max-w-[640px]" />
    </div>
  );
}
