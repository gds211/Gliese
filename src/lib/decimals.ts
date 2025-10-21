// src/lib/decimals.ts
import { Address, PublicClient } from "viem";
import { ERC20_ABI } from "@/abi/erc20";
import { readContractWithGate } from "@/lib/rpcGate";

const decimalsCache = new Map<string, number>();

export async function getDecimals(client: PublicClient, token?: string): Promise<number> {
  if (!token) return 18;
  if (token in ["", undefined, null] as any) return 18;
  const key = token.toLowerCase();
  if (decimalsCache.has(key)) return decimalsCache.get(key)!;

  // Native coin  18 (for MON)
  if (token === "0x0000000000000000000000000000000000000000") return 18;

  try {
    const d = await readContractWithGate(client as any, {
      abi: ERC20_ABI,
      address: token as Address,
      functionName: "decimals",
    }) as number;
    decimalsCache.set(key, d);
    return d;
  } catch {
    // Fallback if token is misconfigured
    return 18;
  }
}
