// src/hooks/useTokenBalances.ts
import { useMemo } from "react";
import { Address, formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";

// minimal ABI – only what we need
const ERC20_MIN_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals",  stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

export type TokenInput =
  | { address: Address; symbol?: string; decimals?: number }
  | { address?: null; symbol: string; decimals?: number }; // native (no address)

export type TokenBalance = { value: bigint; decimals: number };

export type UseTokenBalancesArgs = {
  owner?: Address;
  tokens: TokenInput[]; // include only what you plan to show to the user (e.g., first 100 results)
  enabled?: boolean;
};

/**
 * Batch‑loads balances (and decimals) for many ERC‑20s in one go, plus native balance.
 * Uses viem's readContracts (Multicall3 if available) and falls back gracefully.
 */
export function useTokenBalances({ owner, tokens, enabled = true }: UseTokenBalancesArgs) {
  const client = usePublicClient();

  // Build a stable, compact query key – order doesn't matter.
  const key = useMemo(() => {
    const addrs = tokens
      .map((t) => ("address" in t && t.address ? (t.address as string).toLowerCase() : null))
      .filter(Boolean) as string[];
    addrs.sort(); // ensure stable key even if UI order changes
    return ["balances.bulk", client?.chain?.id ?? 0, owner?.toLowerCase() ?? "", addrs];
  }, [client?.chain?.id, owner, tokens]);

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(client && owner && tokens?.length && enabled),
    staleTime: 30_000, // 30s – good UX, avoids spam
    gcTime: 5 * 60_000, // 5 min cache
    queryFn: async (): Promise<Map<string, TokenBalance>> => {
      if (!client || !owner) return new Map();

      // separate ERC‑20s from native
      const erc20s = tokens
        .map((t) => ("address" in t ? t.address : null))
        .filter((a): a is Address => !!a);

      // Prepare batched calls
      const balanceCalls = erc20s.map((addr) => ({
        address: addr,
        abi: ERC20_MIN_ABI,
        functionName: "balanceOf" as const,
        args: [owner],
      }));
      const decimalsCalls = erc20s.map((addr) => ({
        address: addr,
        abi: ERC20_MIN_ABI,
        functionName: "decimals" as const,
        args: [],
      }));

      // Execute in as few round‑trips as possible.
      const [erc20Balances, erc20Decimals, native] = await Promise.all([
        balanceCalls.length
          ? client.readContracts({ contracts: balanceCalls, allowFailure: true })
          : Promise.resolve([]),
        decimalsCalls.length
          ? client.readContracts({ contracts: decimalsCalls, allowFailure: true })
          : Promise.resolve([]),
        client.getBalance({ address: owner }),
      ]);

      const out = new Map<string, TokenBalance>();

      // Fill ERC‑20s
      for (let i = 0; i < erc20s.length; i++) {
        const addr = (erc20s[i] as string).toLowerCase();
        const bal = (erc20Balances as any[])[i]?.result as bigint | undefined;
        const dec = Number((erc20Decimals as any[])[i]?.result ?? 18);
        out.set(addr, { value: bal ?? 0n, decimals: Number.isFinite(dec) ? dec : 18 });
      }

      // Native balance under a reserved key
      out.set("__NATIVE__", { value: native ?? 0n, decimals: 18 });

      return out;
    },
  });

  // Small helper to read/format a row in render code.
  const formatFor = (t: TokenInput) => {
    const key = "address" in t && t.address ? (t.address as string).toLowerCase() : "__NATIVE__";
    const entry = query.data?.get(key);
    if (!entry) return { text: "…", raw: 0n, decimals: 18 };
    const num = Number(formatUnits(entry.value, entry.decimals));
    const text =
      num < 0.01 && num > 0 ? num.toFixed(6) : num.toFixed(2);
    return { text, raw: entry.value, decimals: entry.decimals };
  };

  return {
    ...query,
    map: query.data,     // Map<string, { value, decimals }>
    formatFor,           // convenience accessor
  };
}

