'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download } from 'lucide-react';
import { ExportForm } from '@/components/export/export-form';

// Same export flow as /dashboard/export, just reachable as a quick modal from
// the Overview header — one implementation, two entry points, so product
// selection and date-range pickers behave identically everywhere.
export function ExportDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Performance Data</DialogTitle>
          <DialogDescription>Xuất dữ liệu đo hiệu năng ra CSV hoặc JSON.</DialogDescription>
        </DialogHeader>

        <ExportForm onExported={() => setTimeout(() => setIsOpen(false), 2000)} />
      </DialogContent>
    </Dialog>
  );
}
