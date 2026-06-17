import * as React from 'react';
import { Upload } from 'lucide-react';

import { cn } from '@renderer/lib/utils';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { useChannelStore } from '@renderer/store/useChannelStore';
import { useConnectionStore, isLive } from '@renderer/store/useConnectionStore';
import { pushStrip } from '@renderer/api/actions';
import { getColor } from '@shared/x32/colors';
import { NAME_MAX, sanitizeName } from '@shared/validation/name';

interface ChannelRowProps {
  index: number;
}

export const ChannelRow = React.memo(function ChannelRow({
  index,
}: ChannelRowProps): React.JSX.Element {
  const strip = useChannelStore((s) => s.strips[index - 1]);
  const dirty = useChannelStore((s) => !!s.dirty[index]);
  const setName = useChannelStore((s) => s.setName);
  const live = useConnectionStore((s) => isLive(s.status));

  const len = strip.name.length;
  const atLimit = len >= NAME_MAX;

  return (
    <div className="group grid grid-cols-[3.25rem_1fr_3.5rem_5.5rem] items-center gap-2 border-b border-border/50 px-3 py-1.5 hover:bg-accent/30">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-6 w-1.5 rounded-full"
          style={{ backgroundColor: getColor(strip.color).hex }}
          title={getColor(strip.color).label}
        />
        <span
          className={cn(
            'text-xs tabular-nums',
            dirty ? 'font-semibold text-primary' : 'text-muted-foreground',
          )}
        >
          {String(index).padStart(2, '0')}
        </span>
      </div>

      <Input
        value={strip.name}
        maxLength={NAME_MAX}
        spellCheck={false}
        placeholder="—"
        onChange={(e) => setName(index, sanitizeName(e.target.value).name)}
        className={cn('h-8 font-medium', dirty && 'border-primary/60 ring-1 ring-primary/30')}
      />

      <div
        className={cn(
          'text-right text-xs tabular-nums',
          atLimit ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {len}/{NAME_MAX}
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
