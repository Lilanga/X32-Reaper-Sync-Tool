/**
 * Binds every IPC channel to a ServiceHub method, validating renderer input with
 * zod at the boundary so malformed payloads can never reach the OSC layer.
 */

import { ipcMain } from 'electron';
import { z } from 'zod';

import { IPC } from '@shared/ipc/channels';
import { BANKS } from '@shared/x32/banks';
import type { BankId, StripField } from '@shared/x32/banks';
import type { ChannelStripValue } from '@shared/model/channelStrip';
import type { ServiceHub } from '../services/ServiceHub';

const bankIds = Object.keys(BANKS) as [BankId, ...BankId[]];
const bankIdSchema = z.enum(bankIds);
const fieldSchema = z.enum(['name', 'color', 'icon']);

const stripValueSchema = z.object({
  bankId: bankIdSchema,
  index: z.number().int().min(1),
  name: z.string(),
  color: z.number().int(),
  icon: z.number().int(),
});

const connectSchema = z.object({ ip: z.string(), port: z.number().int().positive().optional() });
const readBankSchema = z.object({ bankId: bankIdSchema, fields: z.array(fieldSchema).min(1) });
const readStripSchema = z.object({
  bankId: bankIdSchema,
  index: z.number().int().min(1),
  fields: z.array(fieldSchema).optional(),
});
const pushStripSchema = z.object({
  bankId: bankIdSchema,
  index: z.number().int().min(1),
  name: z.string().optional(),
  color: z.number().int().optional(),
  icon: z.number().int().optional(),
});
const pushBankSchema = z.object({
  bankId: bankIdSchema,
  strips: z.array(stripValueSchema),
  fields: z.array(fieldSchema).optional(),
});
const simSchema = z.object({ enabled: z.boolean() });
const settingsPatchSchema = z.object({
  lastConsoleIp: z.string().optional(),
  consolePort: z.number().int().positive().optional(),
  reaperListenPort: z.number().int().positive().optional(),
  reaperHost: z.string().optional(),
  reaperPort: z.number().int().positive().optional(),
  simulatorEnabled: z.boolean().optional(),
  simulatorPort: z.number().int().positive().optional(),
  theme: z.enum(['dark', 'light', 'system']).optional(),
});
const reaperConnectSchema = z.object({
  listenPort: z.number().int().positive().optional(),
  reaperHost: z.string().optional(),
  reaperPort: z.number().int().positive().optional(),
});

export function registerIpc(hub: ServiceHub): void {
  ipcMain.handle(IPC.appGetState, () => hub.getState());

  ipcMain.handle(IPC.consoleConnect, (_e, raw) => hub.connect(connectSchema.parse(raw)));
  ipcMain.handle(IPC.consoleDisconnect, () => hub.disconnect());

  ipcMain.handle(IPC.consoleReadBank, (_e, raw) => {
    const req = readBankSchema.parse(raw);
    return hub.readBank({ bankId: req.bankId, fields: req.fields as StripField[] });
  });
  ipcMain.handle(IPC.consoleReadStrip, (_e, raw) => {
    const req = readStripSchema.parse(raw);
    return hub.readStrip({ bankId: req.bankId, index: req.index, fields: req.fields as StripField[] });
  });
  ipcMain.handle(IPC.consolePushStrip, (_e, raw) => hub.pushStrip(pushStripSchema.parse(raw)));
  ipcMain.handle(IPC.consolePushBank, (_e, raw) => {
    const req = pushBankSchema.parse(raw);
    return hub.pushBank({
      bankId: req.bankId,
      strips: req.strips as ChannelStripValue[],
      fields: req.fields as StripField[] | undefined,
    });
  });

  ipcMain.handle(IPC.simSetEnabled, (_e, raw) => hub.setSimEnabled(simSchema.parse(raw).enabled));
  ipcMain.handle(IPC.settingsGet, () => hub.getSettings());
  ipcMain.handle(IPC.settingsSet, (_e, raw) => hub.setSettings(settingsPatchSchema.parse(raw)));

  ipcMain.handle(IPC.reaperConnect, (_e, raw) => hub.reaperConnect(reaperConnectSchema.parse(raw)));
  ipcMain.handle(IPC.reaperDisconnect, () => hub.reaperDisconnect());
  ipcMain.handle(IPC.reaperRefresh, () => hub.reaperRefresh());
  ipcMain.handle(IPC.reaperGetTracks, () => hub.reaperGetTracks());
  ipcMain.handle(IPC.reaperInstallPattern, () => hub.reaperInstallPattern());
}
