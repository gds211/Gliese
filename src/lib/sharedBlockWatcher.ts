// src/lib/sharedBlockWatcher.ts
import type { PublicClient } from "viem";

type Listener = (blockNumber: bigint) => void;

const listeners = new Set<Listener>();
let lastBlock: bigint | undefined;
let unwatchInternal: (() => void) | undefined;
let currentClient: PublicClient | undefined;

function hasBlockWatcher(client: PublicClient | undefined): client is PublicClient {
  return !!client && typeof client.watchBlockNumber === "function";
}

function ensureWatching(client: PublicClient | undefined) {
  if (!hasBlockWatcher(client)) return;

  if (unwatchInternal && currentClient === client) return;

  if (unwatchInternal) {
    try {
      unwatchInternal();
    } catch {
      // ignore cleanup failures
    }
    unwatchInternal = undefined;
  }

  currentClient = client;

  unwatchInternal = client.watchBlockNumber({
    emitOnBegin: true,
    onBlockNumber: (bn) => {
      lastBlock = bn;
      for (const listener of Array.from(listeners)) {
        try {
          listener(bn);
        } catch {
          // keep other listeners alive
        }
      }
    },
    onError: () => {},
  });
}

export function onNewBlock(
  client: PublicClient | undefined,
  cb: Listener
): () => void {
  if (!hasBlockWatcher(client)) return () => {};

  ensureWatching(client);

  if (lastBlock !== undefined) {
    try {
      cb(lastBlock);
    } catch {
      // ignore subscriber errors
    }
  }

  listeners.add(cb);

  return () => {
    listeners.delete(cb);

    if (listeners.size === 0 && unwatchInternal) {
      try {
        unwatchInternal();
      } finally {
        unwatchInternal = undefined;
        currentClient = undefined;
        lastBlock = undefined;
      }
    }
  };
}
