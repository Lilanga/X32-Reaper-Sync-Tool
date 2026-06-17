import { cn } from '@renderer/lib/utils';

/** TriTone Labs wave mark — a waveform stroked with the blue→violet→magenta→amber brand gradient. */
export function WaveMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 28" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="tritoneWave" x1="0" y1="0" x2="48" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3BA3FF" />
          <stop offset="38%" stopColor="#7C5CFF" />
          <stop offset="70%" stopColor="#D158C7" />
          <stop offset="100%" stopColor="#F0995C" />
        </linearGradient>
      </defs>
      <path
        d="M2 14 C 6 14 7 4 12 4 C 17 4 18 24 23 24 C 28 24 29 4 34 4 C 39 4 40 14 46 14"
        stroke="url(#tritoneWave)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Header lockup: wave mark + "TRITONE LABS" wordmark + product subtitle. */
export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <WaveMark className="h-7 w-11 shrink-0" />
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-[0.2em]">
          TRITONE<span className="font-light text-muted-foreground"> LABS</span>
        </div>
        <div className="text-[10px] tracking-[0.16em] text-muted-foreground">X32 · REAPER SYNC</div>
      </div>
    </div>
  );
}
