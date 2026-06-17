import { useState } from 'react';

import { cn } from '@renderer/lib/utils';
import { Popover } from '@renderer/components/ui/popover';
import { ICON_MAX, clampIcon } from '@shared/x32/icons';

const ICON_IDS = Array.from({ length: ICON_MAX }, (_, i) => i + 1);

interface IconPickerProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function IconGrid({ value, onPick }: { value: number; onPick: (id: number) => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim();
  const ids = q ? ICON_IDS.filter((id) => String(id).includes(q)) : ICON_IDS;

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find icon #"
        inputMode="numeric"
        className="mb-2 h-7 w-full rounded border border-input bg-background/40 px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="grid max-h-52 grid-cols-6 gap-1 overflow-y-auto pr-0.5">
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            className={cn(
              'flex h-8 items-center justify-center rounded border text-xs tabular-nums transition-colors',
              value === id
                ? 'border-primary bg-primary/15 font-semibold text-primary'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {id}
          </button>
        ))}
        {ids.length === 0 && (
          <div className="col-span-6 py-3 text-center text-[11px] text-muted-foreground">
            No icon #{q}
          </div>
        )}
      </div>
      <div className="mt-1.5 px-0.5 text-[10px] text-muted-foreground">
        X32 built-in icon number (1–74)
      </div>
    </div>
  );
}

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const icon = clampIcon(value);
  return (
    <Popover
      width={244}
      disabled={disabled}
      triggerLabel={`Icon ${icon}`}
      triggerClassName={cn(
        'flex h-6 min-w-[1.75rem] items-center justify-center rounded border border-border bg-background/40 px-1 text-[11px] tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        disabled && 'pointer-events-none opacity-50',
      )}
      triggerContent={icon}
    >
      {(close) => (
        <IconGrid
          value={icon}
          onPick={(id) => {
            onChange(id);
            close();
          }}
        />
      )}
    </Popover>
  );
}
