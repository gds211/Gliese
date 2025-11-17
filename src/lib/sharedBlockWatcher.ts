// src/lib/sharedBlockWatcher.ts
// A tiny singleton to ensure we only have ONE underlying block-number subscription
// regardless of how many hooks/components want to react on new blocks.
import type { PublicClient } from "viem";

type Listener = (blockNumber: bigint) => void;

const listeners = new Set<Listener>();
let lastBlock: bigint | undefined;
let unwatchInternal: (() => void) | undefined;
let currentClient: PublicClient | undefined;

function ensureWatching(client: PublicClient) {
  if (unwatchInternal && currentClient === client) return;
  if (unwatchInternal) {
    unwatchInternal();
    unwatchInternal = undefined;
  }
  currentClient = client;
  unwatchInternal = client.watchBlockNumber({
    emitOnBegin: true,
    onBlockNumber: (bn) => {
      lastBlock = bn;
      for (const l of Array.from(listeners)) {
        try { l(bn); } catch {}
      }
    },
    onError: () => {},
  });
}

/** Subscribe a callback to "new block" ticks. Disposes the underlying subscription when the
 *  last listener unsubscribes. Returns an unsubscriber.
 */
export function onNewBlock(client: PublicClient, cb: Listener) {
  ensureWatching(client);
  // Immediately emit last known block for late subscribers (avoids extra RPCs).
  if (lastBlock !== undefined) {
    try { cb(lastBlock); } catch {}
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && unwatchInternal) {
      // Lazy tear-down
      try { unwatchInternal(); } finally {
        unwatchInternal = undefined;
        currentClient = undefined;
        lastBlock = undefined;
      }
    }
  };
}
