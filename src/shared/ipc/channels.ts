/**
 * Single source of truth for IPC channel + event names. Plain `as const` object
 * (not a const enum) so it survives `isolatedModules` bundling cleanly.
 */

export const IPC = {
  appGetState: 'app:getState',
  consoleConnect: 'console:connect',
  consoleDisconnect: 'console:disconnect',
  consoleReadBank: 'console:readBank',
  consoleReadStrip: 'console:readStrip',
  consolePushStrip: 'console:pushStrip',
  consolePushBank: 'console:pushBank',
  simSetEnabled: 'sim:setEnabled',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  reaperConnect: 'reaper:connect',
  reaperDisconnect: 'reaper:disconnect',
  reaperRefresh: 'reaper:refresh',
  reaperGetTracks: 'reaper:getTracks',
  reaperInstallPattern: 'reaper:installPattern',
} as const;

export const EVENTS = {
  consoleStatus: 'console:status',
  consoleChanged: 'console:changed',
  reaperStatus: 'reaper:status',
  reaperTracks: 'reaper:tracks',
  reaperMonitor: 'reaper:monitor',
  logLine: 'log:line',
} as const;

export type IpcName = (typeof IPC)[keyof typeof IPC];
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
