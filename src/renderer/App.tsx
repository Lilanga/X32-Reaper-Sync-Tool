import { useBootstrap } from '@renderer/hooks/useBootstrap';
import { ConnectionBar } from '@renderer/components/ConnectionBar';
import { ChannelGrid } from '@renderer/components/ChannelGrid';
import { ReaperPanel } from '@renderer/components/ReaperPanel';
import { StatusBar } from '@renderer/components/StatusBar';
import { Toaster } from '@renderer/components/Toaster';

export default function App() {
  useBootstrap();

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <ConnectionBar />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-base font-semibold">Input Channels</h1>
              <p className="text-xs text-muted-foreground">
                Edit names below, then push to the console. The X32 stores up to 12 characters per
                channel.
              </p>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <ChannelGrid />
          </div>
        </main>
        <ReaperPanel />
      </div>
      <StatusBar />
      <Toaster />
    </div>
  );
}
