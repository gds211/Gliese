// src/hooks/useTokenBalance.ts
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
export type Address = `0x${string}`;

export type TokenMeta = {
  symbol: string;
  address?: Address; // omit or ignore for native
  decimals?: number;
  name?: string;
  logoURI?: string;
};

export type TokenBalance = {
  raw: bigint;
  decimals: number;
  formatted: string;
  isLoading: boolean;
  isError: boolean;
  refetch?: () => void;
};

// Floors a bigint amount to a decimal string with up to maxFractionDigits (no rounding up)
export function toDecimalStringFloor(raw: bigint, decimals: number, maxFractionDigits = 6): string {
  if (decimals < 0) decimals = 0;
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;

  if (maxFractionDigits === 0 || frac === 0n) {
    return `${negative ? '-' : ''}${whole.toString()}`;
  }

  const scale = 10n ** BigInt(Math.min(maxFractionDigits, decimals));
  const floored = (frac * scale) / base;
  let fracStr = floored.toString().padStart(Number(scale.toString().length) - 1, '0');
  fracStr = fracStr.replace(/0+$/, '');

  return fracStr.length
    ? `${negative ? '-' : ''}${whole.toString()}.${fracStr}`
    : `${negative ? '-' : ''}${whole.toString()}`;
}

/**
 * Fetch the user's balance for a token.
 * - If token.address is absent, returns native coin balance.
 * - If present, reads ERC-20 decimals + balanceOf.
 */
export function useTokenBalance(token?: TokenMeta): TokenBalance {
  const { address } = useAccount();
  const isNative = !!token && !token.address;

  // Native balance
  const native = useBalance({
    address,
    query: {
      enabled: Boolean(address && isNative),
      refetchOnWindowFocus: false,
    },
  });

  // ERC-20 decimals
  const erc20Decimals = useReadContract({
    address: token?.address as Address | undefined,
    abi: erc20Abi,
    functionName: 'decimals',
    query: {
      enabled: Boolean(address && token?.address),
      refetchOnWindowFocus: false,
    },
  });

  // ERC-20 balanceOf
  const erc20Balance = useReadContract({
    address: token?.address as Address | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && token?.address),
      refetchOnWindowFocus: false,
    },
  });

  if (!token || !address) {
    return {
      raw: 0n,
      decimals: token?.decimals ?? 18,
      formatted: '0',
      isLoading: false,
      isError: false,
    };
  }

  if (isNative) {
    const raw = native.data?.value ?? 0n;
    const decimals = native.data?.decimals ?? 18;
    return {
      raw,
      decimals,
      formatted: toDecimalStringFloor(raw, decimals),
      isLoading: native.isLoading,
      isError: !!native.error,
      refetch: native.refetch,
    };
  }

  const decimals = token.decimals ?? (typeof erc20Decimals.data === 'number' ? erc20Decimals.data : undefined) ?? 18;
  const raw = (erc20Balance.data as bigint | undefined) ?? 0n;
  const isLoading = erc20Balance.isLoading || erc20Decimals.isLoading;
  const isError = !!erc20Balance.error || !!erc20Decimals.error;

  return {
    raw,
    decimals,
    formatted: toDecimalStringFloor(raw, decimals),
    isLoading,
    isError,
  };
}

