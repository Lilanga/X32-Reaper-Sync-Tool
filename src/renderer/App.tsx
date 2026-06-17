import { useBootstrap } from '@renderer/hooks/useBootstrap';
import { ConnectionBar } from '@renderer/components/ConnectionBar';
import { BankSwitcher } from '@renderer/components/BankSwitcher';
import { ChannelGrid } from '@renderer/components/ChannelGrid';
import { ReaperPanel } from '@renderer/components/ReaperPanel';
import { StatusBar } from '@renderer/components/StatusBar';
import { Toaster } from '@renderer/components/Toaster';
import { Button } from '@renderer/components/ui/button';
import { saveLayout, loadLayout } from '@renderer/api/actions';
import { Save, FolderOpen } from 'lucide-react';
import { useChannelStore } from '@renderer/store/useChannelStore';
import { BANKS } from '@shared/x32/banks';

export default function App() {
  useBootstrap();
  const activeBank = useChannelStore((s) => s.activeBank);
  const bank = BANKS[activeBank];

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <ConnectionBar />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <BankSwitcher />
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold">{bank.label}</h1>
              <p className="text-xs text-muted-foreground">
                Edit names{bank.supportsIcon ? ', colors & icons' : ' & colors'}, then push to the
                console. Names are capped at 12 characters.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={() => void saveLayout()}>
                <Save className="h-4 w-4" />
                Save layout
              </Button>
              <Button variant="outline" size="sm" onClick={() => void loadLayout()}>
                <FolderOpen className="h-4 w-4" />
                Load layout
              </Button>
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
