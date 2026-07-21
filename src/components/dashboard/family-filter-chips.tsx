'use client';

import { categoricalColor } from '@/lib/utils/chart-palette';
import { useTheme } from '@/lib/hooks/use-theme';

interface FamilyFilterChipsProps {
  families: string[]; // all available families, fixed order (color source)
  selected: string[]; // empty = "Tất cả" (no compare, aggregate view)
  onChange: (value: string[]) => void;
}

export function FamilyFilterChips({ families, selected, onChange }: FamilyFilterChipsProps) {
  const { theme } = useTheme();

  const toggle = (family: string) => {
    onChange(selected.includes(family) ? selected.filter((f) => f !== family) : [...selected, family]);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => onChange([])}
        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
          selected.length === 0
            ? 'border-brand bg-brand-tint text-brand'
            : 'border-border bg-background text-muted-foreground'
        }`}
      >
        Tất cả
      </button>
      {families.map((family, i) => {
        const active = selected.includes(family);
        const color = categoricalColor(i, theme);
        return (
          <button
            key={family}
            onClick={() => toggle(family)}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
            style={
              active
                ? { borderColor: color, backgroundColor: `${color}1a`, color }
                : { borderColor: 'var(--border)', color: 'var(--text-faint)' }
            }
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            {family}
          </button>
        );
      })}
    </div>
  );
}
