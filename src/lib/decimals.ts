import { formatUnits, parseUnits } from 'viem';

/**
 * Formats a bigint amount to a human-readable string with proper decimals
 */
export const formatTokenAmount = (
  amount: bigint,
  decimals: number,
  displayDecimals: number = 6
): string => {
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);
  
  // Remove unnecessary trailing zeros
  return parseFloat(num.toFixed(displayDecimals)).toString();
};

/**
 * Parses a human-readable amount string to bigint with proper decimals
 */
export const parseTokenAmount = (
  amount: string,
  decimals: number
): bigint => {
  if (!amount || amount === '0' || amount === '') {
    return 0n;
  }
  
  try {
    return parseUnits(amount, decimals);
  } catch {
    return 0n;
  }
};

/**
 * Converts between different decimal precisions
 */
export const convertDecimals = (
  amount: bigint,
  fromDecimals: number,
  toDecimals: number
): bigint => {
  if (fromDecimals === toDecimals) {
    return amount;
  }
  
  if (fromDecimals > toDecimals) {
    const divisor = 10n ** BigInt(fromDecimals - toDecimals);
    return amount / divisor;
  } else {
    const multiplier = 10n ** BigInt(toDecimals - fromDecimals);
    return amount * multiplier;
  }
};

/**
 * Calculates percentage of an amount
 */
export const calculatePercentage = (
  amount: bigint,
  percentage: number
): bigint => {
  return (amount * BigInt(Math.floor(percentage * 100))) / 10000n;
};