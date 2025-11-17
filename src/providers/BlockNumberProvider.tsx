// src/providers/BlockNumberProvider.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { usePublicClient } from "wagmi";

type BlockCtx = {
  blockNumber: bigint | null;
  isWebSocket: boolean;
};

const Ctx = createContext<BlockCtx>({ blockNumber: null, isWebSocket: false });

export function BlockNumberProvider({ children }: PropsWithChildren) {
  const client = usePublicClient();
  const [bn, setBn] = useState<bigint | null>(null);

  useEffect(() => {
    if (!client) return;
    let dead = false;

    // Single global watcher; consumers subscribe via context.
    const unwatch = client.watchBlockNumber({
      emitOnBegin: true,
      onBlockNumber: (next) => {
        if (!dead) setBn(next);
      },
      onError: () => {
        // noop – we just keep the last block
      },
    });

    return () => {
      dead = true;
      unwatch?.();
    };
  }, [client]);

  const value = useMemo(
    () => ({ blockNumber: bn, isWebSocket: (client?.transport as any)?.type === "webSocket" }),
    [bn, client]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBlockNumber() {
  return useContext(Ctx);
}
