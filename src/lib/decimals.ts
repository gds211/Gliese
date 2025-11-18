// src/lib/decimals.ts
import { Address, PublicClient } from "viem";
import { ERC20_ABI } from "@/abi/erc20";

const memCache = new Map<string, number>();
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function storageKey(chainId: number | undefined, token: string) {
  return `tokenDecimals:${chainId ?? 0}:${token.toLowerCase()}`;
}

export async function getDecimals(client: PublicClient, token?: string): Promise<number> {
  if (!token) return 18;
  if ((["", undefined, null] as any).includes(token)) return 18;
  if (token === "0x0000000000000000000000000000000000000000") return 18;

  const chainId = (client as any)?.chain?.id ?? 0;
  const key = storageKey(chainId, token);

  if (memCache.has(key)) return memCache.get(key)!;

  // localStorage cache
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { v: number; t: number };
          if (typeof parsed?.v === "number" && Number.isFinite(parsed.v) && Date.now() - parsed.t < TTL_MS) {
            memCache.set(key, parsed.v);
            return parsed.v;
          }
        } catch {}
      }
    }
  } catch {}

  try {
    const d = (await client.readContract({
      abi: ERC20_ABI,
      address: token as Address,
      functionName: "decimals",
    })) as number;
    memCache.set(key, d);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, JSON.stringify({ v: d, t: Date.now() }));
      }
    } catch {}
    return d;
  } catch {
    memCache.set(key, 18);
    return 18;
  }
}
