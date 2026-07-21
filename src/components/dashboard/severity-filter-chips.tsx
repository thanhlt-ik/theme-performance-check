'use client';

import { Severity } from '@/lib/utils/severity';

const OPTIONS: { value: Severity; label: string }[] = [
  { value: 'good', label: 'Tốt' },
  { value: 'warn', label: 'Cần cải thiện' },
  { value: 'poor', label: 'Kém' },
];

const ACTIVE_CLASSES: Record<Severity, string> = {
  good: 'bg-sev-good text-sev-good-foreground border-transparent',
  warn: 'bg-sev-warn text-sev-warn-foreground border-transparent',
  poor: 'bg-sev-poor text-sev-poor-foreground border-transparent',
};

interface SeverityFilterChipsProps {
  value: Severity[]; // empty = all
  onChange: (value: Severity[]) => void;
}

export function SeverityFilterChips({ value, onChange }: SeverityFilterChipsProps) {
  const toggle = (severity: Severity) => {
    onChange(value.includes(severity) ? value.filter((s) => s !== severity) : [...value, severity]);
  };

  return (
    <div className="flex items-center gap-1.5">
      {OPTIONS.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              active ? ACTIVE_CLASSES[opt.value] : 'border-border bg-background text-muted-foreground'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
