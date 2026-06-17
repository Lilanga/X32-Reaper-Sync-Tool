/**
 * Strongly-typed facade over the preload `window.api` bridge. Channel names and
 * payloads are checked against the shared IpcContract at compile time.
 */

import type {
  IpcChannel,
  IpcContract,
  EventChannel,
  EventContract,
} from '@shared/ipc/contract';

declare global {
  interface Window {
    api: {
      invoke: (channel: string, payload?: unknown) => Promise<unknown>;
      on: (channel: string, listener: (payload: unknown) => void) => () => void;
    };
  }
}

type ReqArgs<C extends IpcChannel> = IpcContract[C]['req'] extends void
  ? []
  : [req: IpcContract[C]['req']];

export function invoke<C extends IpcChannel>(
  channel: C,
  ...args: ReqArgs<C>
): Promise<IpcContract[C]['res']> {
  return window.api.invoke(channel, args[0]) as Promise<IpcContract[C]['res']>;
}

export function onEvent<E extends EventChannel>(
  event: E,
  cb: (payload: EventContract[E]) => void,
): () => void {
  return window.api.on(event, cb as (payload: unknown) => void);
}
