import * as React from 'react';
import { Upload } from 'lucide-react';

import { cn } from '@renderer/lib/utils';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { ColorPicker } from '@renderer/components/ColorPicker';
import { IconPicker } from '@renderer/components/IconPicker';
import { useChannelStore, hasDirtyField } from '@renderer/store/useChannelStore';
import { useConnectionStore, isLive } from '@renderer/store/useConnectionStore';
import { pushStrip } from '@renderer/api/actions';
import { NAME_MAX, sanitizeName } from '@shared/validation/name';

const ROW_COLS = 'grid-cols-[2.25rem_1.75rem_2.5rem_1fr_4.75rem]';

export const ChannelRow = React.memo(function ChannelRow({ index }: { index: number }) {
  const strip = useChannelStore((s) => s.strips[index - 1]);
  const dirtyFlags = useChannelStore((s) => s.dirty[index]);
  const setName = useChannelStore((s) => s.setName);
  const setColor = useChannelStore((s) => s.setColor);
  const setIcon = useChannelStore((s) => s.setIcon);
  const live = useConnectionStore((s) => isLive(s.status));

  const dirty = hasDirtyField(dirtyFlags);
  const len = strip.name.length;
  const atLimit = len >= NAME_MAX;

  return (
    <div
      className={cn(
        'group grid items-center gap-2 border-b border-border/50 px-3 py-1.5 hover:bg-accent/30',
        ROW_COLS,
      )}
    >
      <span
        className={cn(
          'text-xs tabular-nums',
          dirty ? 'font-semibold text-primary' : 'text-muted-foreground',
        )}
      >
        {String(index).padStart(2, '0')}
      </span>

      <ColorPicker value={strip.color} onChange={(v) => setColor(index, v)} />
      <IconPicker value={strip.icon} onChange={(v) => setIcon(index, v)} />

      <div className="relative">
        <Input
          value={strip.name}
          maxLength={NAME_MAX}
          spellCheck={false}
          placeholder="—"
          onChange={(e) => setName(index, sanitizeName(e.target.value).name)}
          className={cn(
            'h-8 pr-9 font-medium',
            dirtyFlags?.name && 'border-primary/60 ring-1 ring-primary/30',
          )}
        />
        <span
          className={cn(
            'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tabular-nums',
            atLimit ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {len}/{NAME_MAX}
        </span>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          variant={dirty ? 'default' : 'ghost'}
          disabled={!live}
          onClick={() => void pushStrip(index)}
          className="h-7"
          title={live ? 'Push this channel' : 'Connect to push'}
        >
          <Upload className="h-3.5 w-3.5" />
          Push
        </Button>
      </div>
    </div>
  );
});
