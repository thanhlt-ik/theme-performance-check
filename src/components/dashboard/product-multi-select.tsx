'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

interface Product {
  id: string;
  name: string;
}

interface ProductMultiSelectProps {
  products: Product[];
  selected: string[]; // empty = "all products"
  onChange: (ids: string[]) => void;
  className?: string;
}

export function ProductMultiSelect({ products, selected, onChange, className }: ProductMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const summary =
    selected.length === 0
      ? 'Tất cả sản phẩm'
      : selected.length === 1
        ? products.find((p) => p.id === selected[0])?.name ?? '1 sản phẩm'
        : `${selected.length} sản phẩm đã chọn`;

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground min-w-[200px] justify-between"
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-[260px] rounded-md border border-border bg-card shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theme..."
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5 text-[11px]">
            <button className="text-brand hover:underline" onClick={() => onChange(products.map((p) => p.id))}>
              Chọn tất cả
            </button>
            <button className="text-muted-foreground hover:underline" onClick={() => onChange([])}>
              Bỏ chọn
            </button>
          </div>

          <div className="max-h-[260px] overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Không tìm thấy theme nào.</div>
            )}
            {filtered.map((product) => {
              const isSelected = selected.includes(product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => toggle(product.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-foreground hover:bg-muted"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected ? 'border-brand bg-brand' : 'border-border'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="truncate">{product.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
