import { cn } from '@renderer/lib/utils';
import { Popover } from '@renderer/components/ui/popover';
import { COLORS, getColor, type X32Color } from '@shared/x32/colors';

/** A single X32 color swatch. Off = dashed outline; inverted = hue with a light inner ring. */
export function ColorSwatch({ color, className }: { color: X32Color; className?: string }) {
  if (color.value === 0) {
    return (
      <span
        className={cn(
          'flex items-center justify-center rounded border border-dashed border-muted-foreground/60 text-[7px] uppercase text-muted-foreground',
          className,
        )}
      >
        off
      </span>
    );
  }
  return (
    <span
      className={cn('rounded', className)}
      style={{
        backgroundColor: color.hex,
        boxShadow: color.inverted ? 'inset 0 0 0 2px rgba(255,255,255,0.85)' : undefined,
      }}
    />
  );
}

interface ColorPickerProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  const current = getColor(value);
  return (
    <Popover
      width={208}
      disabled={disabled}
      triggerLabel={`Color: ${current.label}`}
      triggerClassName={cn(
        'inline-flex rounded transition-transform hover:scale-105',
        disabled && 'pointer-events-none opacity-50',
      )}
      triggerContent={<ColorSwatch color={current} className="h-6 w-6" />}
    >
      {(close) => (
        <div>
          <div className="mb-1.5 px-0.5 text-[11px] font-medium text-muted-foreground">
            Scribble strip color
          </div>
          <div className="grid grid-cols-8 gap-1">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => {
                  onChange(c.value);
                  close();
                }}
                className={cn(
                  'rounded ring-offset-2 ring-offset-popover',
                  value === c.value && 'ring-2 ring-primary',
                )}
              >
                <ColorSwatch color={c} className="h-5 w-5" />
              </button>
            ))}
          </div>
          <div className="mt-1.5 px-0.5 text-[10px] text-muted-foreground">
            Top row normal · bottom row inverted
          </div>
        </div>
      )}
    </Popover>
  );
}
