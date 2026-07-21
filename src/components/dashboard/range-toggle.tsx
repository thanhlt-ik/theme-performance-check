'use client';

interface RangeOption {
  value: number;
  label: string;
}

interface RangeToggleProps {
  value: number;
  options: RangeOption[];
  onChange: (value: number) => void;
}

export function RangeToggle({ value, options, onChange }: RangeToggleProps) {
  return (
    <div className="flex gap-1.5">
      {options.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
            value === range.value
              ? 'border-border bg-brand-tint text-brand'
              : 'border-border bg-background text-muted-foreground'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
