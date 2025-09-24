/**
 * Mathematical utilities for DeFi calculations
 */

/**
 * Calculates slippage amount from a base amount
 */
export const calculateSlippage = (
  amount: bigint,
  slippageBps: bigint
): bigint => {
  return (amount * slippageBps) / 10000n;
};

/**
 * Calculates minimum amount out with slippage protection
 */
export const calculateMinAmountOut = (
  amountOut: bigint,
  slippageBps: bigint
): bigint => {
  const slippageAmount = calculateSlippage(amountOut, slippageBps);
  return amountOut - slippageAmount;
};

/**
 * Calculates maximum amount in with slippage protection
 */
export const calculateMaxAmountIn = (
  amountIn: bigint,
  slippageBps: bigint
): bigint => {
  const slippageAmount = calculateSlippage(amountIn, slippageBps);
  return amountIn + slippageAmount;
};

/**
 * Calculates price impact between input and output amounts
 */
export const calculatePriceImpact = (
  amountIn: bigint,
  amountOut: bigint,
  decimalsIn: number,
  decimalsOut: number
): number => {
  if (amountIn === 0n || amountOut === 0n) return 0;
  
  // Normalize to same decimal precision for comparison
  const normalizedAmountIn = decimalsIn > decimalsOut 
    ? amountIn / (10n ** BigInt(decimalsIn - decimalsOut))
    : amountIn * (10n ** BigInt(decimalsOut - decimalsIn));
  
  const difference = normalizedAmountIn > amountOut 
    ? normalizedAmountIn - amountOut 
    : amountOut - normalizedAmountIn;
    
  const impact = Number(difference * 10000n / normalizedAmountIn) / 100;
  return Math.abs(impact);
};

/**
 * Safely multiplies two bigints avoiding overflow
 */
export const safeMul = (a: bigint, b: bigint): bigint => {
  return a * b;
};

/**
 * Safely divides two bigints with rounding
 */
export const safeDiv = (a: bigint, b: bigint, roundUp: boolean = false): bigint => {
  if (b === 0n) return 0n;
  
  const result = a / b;
  const remainder = a % b;
  
  if (roundUp && remainder > 0n) {
    return result + 1n;
  }
  
  return result;
};

/**
 * Checks if an amount is zero or very close to zero
 */
export const isZeroAmount = (amount: bigint, threshold: bigint = 1n): boolean => {
  return amount < threshold;
};