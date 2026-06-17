import { describe, expect, it } from 'vitest';

import {
  chooseReaperOscSurface,
  parseReaperOscSurfaceLine,
} from '@main/services/reaper/reaperConfig';

describe('reaperConfig', () => {
  it('parses a REAPER OSC control surface line', () => {
    const surface = parseReaperOscSurfaceLine(
      'csurf_0=OSC "X32-Sync-Tool" 7 8000 "192.168.0.187" 9000 1024 10 "X32SyncTool"',
    );

    expect(surface).toEqual({
      name: 'X32-Sync-Tool',
      localListenPort: 8000,
      deviceHost: '192.168.0.187',
      devicePort: 9000,
      pattern: 'X32SyncTool',
      raw: 'csurf_0=OSC "X32-Sync-Tool" 7 8000 "192.168.0.187" 9000 1024 10 "X32SyncTool"',
    });
  });

  it('prefers the X32 sync surface when multiple OSC surfaces exist', () => {
    const generic = parseReaperOscSurfaceLine(
      'csurf_0=OSC "Generic Tablet" 7 8100 "127.0.0.1" 9100 1024 10 "Default"',
    );
    const x32 = parseReaperOscSurfaceLine(
      'csurf_1=OSC "X32-Sync-Tool" 7 8000 "192.168.0.187" 9000 1024 10 "X32SyncTool"',
    );

    expect(chooseReaperOscSurface([generic!, x32!])).toBe(x32);
  });
});
