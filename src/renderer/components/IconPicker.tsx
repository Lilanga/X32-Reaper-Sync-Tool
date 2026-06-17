import { useState } from 'react';

import { cn } from '@renderer/lib/utils';
import { Popover } from '@renderer/components/ui/popover';
import { ICON_MAX, clampIcon } from '@shared/x32/icons';
import { IconGlyph, iconLabel } from '@renderer/lib/iconGlyphs';

const ICON_IDS = Array.from({ length: ICON_MAX }, (_, i) => i + 1);

function IconGrid({ value, onPick }: { value: number; onPick: (id: number) => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const ids = q
    ? ICON_IDS.filter((id) => String(id).includes(q) || iconLabel(id).toLowerCase().includes(q))
    : ICON_IDS;

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search icons — e.g. kick, guitar, mic, 12"
        className="mb-2 h-7 w-full rounded border border-input bg-background/40 px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="grid max-h-56 grid-cols-5 gap-1 overflow-y-auto pr-0.5">
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            title={`${iconLabel(id)} · #${id}`}
            onClick={() => onPick(id)}
            className={cn(
              'flex h-11 flex-col items-center justify-center gap-0.5 rounded border text-[9px] tabular-nums transition-colors',
              value === id
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <IconGlyph id={id} className="h-4 w-4" />
            {id}
          </button>
        ))}
        {ids.length === 0 && (
          <div className="col-span-5 py-3 text-center text-[11px] text-muted-foreground">
            No matching icon
          </div>
        )}
      </div>
      <div className="mt-1.5 px-0.5 text-[10px] text-muted-foreground">
        X32 icon 1–74 · the number is what the console stores
      </div>
    </div>
  );
}

interface IconPickerProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const icon = clampIcon(value);
  return (
    <Popover
      width={268}
      disabled={disabled}
      triggerLabel={`Icon: ${iconLabel(icon)} (#${icon})`}
      triggerClassName={cn(
        'flex h-6 w-7 items-center justify-center rounded border border-border bg-background/40 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        disabled && 'pointer-events-none opacity-50',
      )}
      triggerContent={<IconGlyph id={icon} className="h-4 w-4" />}
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
