import * as React from 'react';
import { cn } from '@renderer/lib/utils';

interface PopoverProps {
  triggerContent: React.ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
  disabled?: boolean;
  width?: number;
  children: (close: () => void) => React.ReactNode;
}

/**
 * Minimal popover: a button trigger plus a fixed-positioned panel anchored under
 * it (fixed so the channel grid's scroll container can't clip it). Closes on
 * outside-click, Escape, or scroll. No external dependency.
 */
export function Popover({
  triggerContent,
  triggerClassName,
  triggerLabel,
  disabled,
  width = 240,
  children,
}: PopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const close = React.useCallback(() => setOpen(false), []);

  const toggle = (): void => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setCoords({ top: r.bottom + 4, left });
    }
    setOpen((o) => !o);
  };

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onScroll = (e: Event): void => {
      const target = e.target as Node | null;
      // Scrolling inside the popover (e.g. the icon grid) must NOT close it.
      if (target && panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={toggle}
        className={cn('focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', triggerClassName)}
      >
        {triggerContent}
      </button>
      {open && coords && (
        <div
          ref={panelRef}
          role="dialog"
          style={{ position: 'fixed', top: coords.top, left: coords.left, width }}
          className="z-50 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-xl"
        >
          {children(close)}
        </div>
      )}
    </>
  );
}
