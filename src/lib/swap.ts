import { Address, Hash } from 'viem';
import { writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { wagmiConfig } from '@/lib/wagmiConfig';
import { YAK_ROUTER_ABI } from '@/abi/yakRouter';
import { ERC20_ABI } from '@/abi/erc20';
import { PUBLIC_CONFIG } from '@/config/public';
import { YakQuote } from '@/hooks/useYakQuote';
import { Token, isNativeToken } from '@/lib/tokens';
import { calculateMinAmountOut } from '@/lib/math';

export interface SwapParams {
  tokenIn: Token;
  tokenOut: Token;
  quote: YakQuote;
  userAddress: Address;
  slippageBps?: bigint;
}

export interface SwapResult {
  hash: Hash;
  success: boolean;
  error?: string;
}

/**
 * Checks if token needs approval and returns current allowance
 */
export const checkTokenAllowance = async (
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address
): Promise<bigint> => {
  const { readContract } = await import('wagmi/actions');
  
  try {
    const allowance = await readContract(wagmiConfig, {
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [ownerAddress, spenderAddress],
    });
    
    return allowance as bigint;
  } catch (error) {
    console.error('Error checking allowance:', error);
    return 0n;
  }
};

/**
 * Approves token spending
 */
export const approveToken = async (
  tokenAddress: Address,
  spenderAddress: Address,
  amount: bigint
): Promise<SwapResult> => {
  try {
    const hash = await writeContract(wagmiConfig, {
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, amount],
    });

    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
    
    return {
      hash,
      success: receipt.status === 'success',
      error: receipt.status === 'reverted' ? 'Transaction reverted' : undefined
    };
  } catch (error) {
    console.error('Error approving token:', error);
    return {
      hash: '0x' as Hash,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Executes a swap through YAK Router
 */
export const executeSwap = async ({
  tokenIn,
  tokenOut,
  quote,
  userAddress,
  slippageBps = PUBLIC_CONFIG.SLIPPAGE_BPS
}: SwapParams): Promise<SwapResult> => {
  try {
    const minAmountOut = calculateMinAmountOut(quote.amountOut, slippageBps);
    
    const trade = {
      amountIn: quote.amountIn,
      amountOut: minAmountOut,
      path: [...quote.path],
      adapters: [...quote.adapters]
    };

    const value = isNativeToken(tokenIn) ? quote.amountIn : 0n;

    const hash = await writeContract(wagmiConfig, {
      address: PUBLIC_CONFIG.YAK_ROUTER as Address,
      abi: YAK_ROUTER_ABI,
      functionName: 'swapNoSplit',
      args: [trade, userAddress, 0n], // 0 fee for now
      value,
    });

    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
    
    return {
      hash,
      success: receipt.status === 'success',
      error: receipt.status === 'reverted' ? 'Swap transaction reverted' : undefined
    };
  } catch (error) {
    console.error('Error executing swap:', error);
    return {
      hash: '0x' as Hash,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown swap error'
    };
  }
};

/**
 * Complete swap flow with approval if needed
 */
export const performSwap = async ({
  tokenIn,
  tokenOut,
  quote,
  userAddress,
  slippageBps
}: SwapParams): Promise<SwapResult> => {
  try {
    // Check if approval is needed for non-native tokens
    if (!isNativeToken(tokenIn)) {
      const currentAllowance = await checkTokenAllowance(
        tokenIn.address,
        userAddress,
        PUBLIC_CONFIG.YAK_ROUTER as Address
      );

      if (currentAllowance < quote.amountIn) {
        console.log('Approving token spend...');
        const approvalResult = await approveToken(
          tokenIn.address,
          PUBLIC_CONFIG.YAK_ROUTER as Address,
          quote.amountIn
        );

        if (!approvalResult.success) {
          return {
            hash: approvalResult.hash,
            success: false,
            error: `Approval failed: ${approvalResult.error}`
          };
        }
      }
    }

    // Execute the swap
    console.log('Executing swap...');
    return await executeSwap({
      tokenIn,
      tokenOut,
      quote,
      userAddress,
      slippageBps
    });

  } catch (error) {
    console.error('Error in swap flow:', error);
    return {
      hash: '0x' as Hash,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in swap flow'
    };
  }
};