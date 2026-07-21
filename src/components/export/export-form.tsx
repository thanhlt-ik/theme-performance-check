'use client';

import { useEffect, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle, Download, Loader2, XCircle } from 'lucide-react';
import { useProducts } from '@/lib/hooks/use-products';

type DeviceChoice = 'DESKTOP' | 'MOBILE' | 'BOTH';
type RangeChoice = '7d' | '30d' | '90d' | 'custom';
type FormatChoice = 'csv' | 'json';

const DEVICE_OPTIONS: { value: DeviceChoice; label: string }[] = [
  { value: 'DESKTOP', label: 'Desktop' },
  { value: 'MOBILE', label: 'Mobile' },
  { value: 'BOTH', label: 'Cả hai' },
];

const RANGE_OPTIONS: { value: RangeChoice; label: string }[] = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '90d', label: '90 ngày' },
  { value: 'custom', label: 'Tuỳ chọn' },
];

const FORMAT_OPTIONS: { value: FormatChoice; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
];

function pillClasses(active: boolean): string {
  return `h-8 px-3.5 rounded-md border text-xs font-semibold transition-colors ${
    active ? 'border-brand bg-brand-tint text-brand' : 'border-border bg-background text-muted-foreground'
  }`;
}

interface ExportFormProps {
  className?: string;
  onExported?: () => void;
}

export function ExportForm({ className, onExported }: ExportFormProps) {
  const { products } = useProducts(true);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [device, setDevice] = useState<DeviceChoice>('BOTH');
  const [range, setRange] = useState<RangeChoice>('30d');
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const [formatChoice, setFormatChoice] = useState<FormatChoice>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [summary, setSummary] = useState('');

  // Default every product to checked the first time the list arrives —
  // don't stomp on the user's own selection on later revalidations.
  useEffect(() => {
    if (products.length > 0 && Object.keys(checked).length === 0) {
      setChecked(Object.fromEntries(products.map((p) => [p.id, true])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const allChecked = checkedCount === products.length;

  const resolveDateRange = (): { dateFrom?: string; dateTo?: string } => {
    if (range === 'custom') {
      return {
        dateFrom: customFrom?.toISOString(),
        dateTo: customTo?.toISOString(),
      };
    }
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    return {
      dateFrom: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      dateTo: new Date().toISOString(),
    };
  };

  const deviceTypes = (): ('DESKTOP' | 'MOBILE')[] => {
    if (device === 'BOTH') return ['DESKTOP', 'MOBILE'];
    return [device];
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setStatus('idle');

      const { dateFrom, dateTo } = resolveDateRange();
      const productIds = allChecked
        ? undefined
        : Object.entries(checked).filter(([, v]) => v).map(([id]) => id);

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom,
          dateTo,
          format: formatChoice,
          productIds,
          deviceTypes: deviceTypes(),
        }),
      });

      if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `performance_data_${new Date().toISOString().split('T')[0]}.${formatChoice}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      const deviceLabel = device === 'BOTH' ? 'Desktop & Mobile' : device;
      const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.label ?? range;
      setSummary(`${allChecked ? products.length : checkedCount} sản phẩm · ${deviceLabel} · ${rangeLabel}`);
      setStatus('success');
      onExported?.();
    } catch (err) {
      console.error('Export error:', err);
      setStatus('error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${className ?? ''}`}>
      <div className="rounded-[10px] border border-border bg-card p-5">
        <div className="text-xs font-semibold text-muted-foreground mb-2.5">Sản phẩm</div>
        <div className="max-h-[180px] overflow-y-auto rounded-md border border-border p-2">
          {products.map((product) => (
            <label key={product.id} className="flex items-center gap-2.5 px-1 py-1.5 text-[13px] text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={checked[product.id] ?? true}
                onChange={(e) => setChecked((prev) => ({ ...prev, [product.id]: e.target.checked }))}
              />
              {product.name}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-[10px] border border-border bg-card p-5">
        <div className="text-xs font-semibold text-muted-foreground mb-2.5">Thiết bị</div>
        <div className="flex gap-2">
          {DEVICE_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setDevice(opt.value)} className={pillClasses(device === opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[10px] border border-border bg-card p-5">
        <div className="text-xs font-semibold text-muted-foreground mb-2.5">Khoảng ngày</div>
        <div className="flex gap-2 flex-wrap">
          {RANGE_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setRange(opt.value)} className={pillClasses(range === opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="relative">
              <button
                onClick={() => setShowFromCalendar((v) => !v)}
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-left text-xs text-foreground flex items-center gap-2"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {customFrom ? format(customFrom, 'MMM d, yyyy') : 'Từ ngày'}
              </button>
              {showFromCalendar && (
                <div className="absolute z-50 mt-1">
                  <Calendar
                    mode="single"
                    selected={customFrom || undefined}
                    onSelect={(date) => {
                      setCustomFrom(date || null);
                      setShowFromCalendar(false);
                    }}
                    className="rounded-md border bg-card shadow-lg"
                  />
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowToCalendar((v) => !v)}
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-left text-xs text-foreground flex items-center gap-2"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {customTo ? format(customTo, 'MMM d, yyyy') : 'Đến ngày'}
              </button>
              {showToCalendar && (
                <div className="absolute z-50 mt-1">
                  <Calendar
                    mode="single"
                    selected={customTo || undefined}
                    onSelect={(date) => {
                      setCustomTo(date || null);
                      setShowToCalendar(false);
                    }}
                    className="rounded-md border bg-card shadow-lg"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[10px] border border-border bg-card p-5">
        <div className="text-xs font-semibold text-muted-foreground mb-2.5">Định dạng</div>
        <div className="flex gap-2">
          {FORMAT_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setFormatChoice(opt.value)} className={pillClasses(formatChoice === opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={isExporting || checkedCount === 0}
        className="h-10 rounded-lg bg-brand text-brand-foreground text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tạo...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Tạo file export
          </>
        )}
      </button>

      {status === 'success' && (
        <div className="rounded-[10px] border border-sev-good bg-card p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <CheckCircle className="h-4 w-4 text-sev-good-foreground" />
            File đã sẵn sàng — {summary}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-[10px] border border-sev-poor bg-card p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <XCircle className="h-4 w-4 text-sev-poor-foreground" />
            Export thất bại. Vui lòng thử lại.
          </div>
        </div>
      )}
    </div>
  );
}
