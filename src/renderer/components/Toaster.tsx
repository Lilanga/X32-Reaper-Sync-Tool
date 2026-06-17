import { useEffect } from 'react';

import { cn } from '@renderer/lib/utils';
import { useToastStore, type Toast } from '@renderer/store/useToastStore';

const VARIANT_STYLES: Record<Toast['variant'], string> = {
  default: 'border-border bg-card',
  success: 'border-emerald-600/40 bg-emerald-950/70 text-emerald-100',
  error: 'border-red-600/50 bg-red-950/70 text-red-100',
  warning: 'border-amber-600/40 bg-amber-950/60 text-amber-100',
};

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 3200);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div
      className={cn(
        'pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-lg backdrop-blur',
        VARIANT_STYLES[toast.variant],
      )}
    >
      {toast.message}
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-10 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDone={() => dismiss(t.id)} />
      ))}
    </div>
  );
}
