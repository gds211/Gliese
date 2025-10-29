import { Address, formatUnits } from "viem";
import { Button } from "@/components/ui/button";
import TokenAvatar from "@/components/TokenAvatar";
import { useTokenBalance } from "@/hooks/useTokenBalance";

interface TokenListItemProps {
  token: {
    symbol: string;
    name?: string;
    address?: `0x${string}`;
  };
  walletAddress?: Address;
  isNative: boolean;
  onSelect: () => void;
}

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatBalance(balance?: bigint, decimals?: number): string {
  if (!balance || !decimals) return "0";
  const formatted = Number(formatUnits(balance, decimals));
  if (formatted === 0) return "0";
  if (formatted < 0.0001) return "< 0.0001";
  if (formatted < 1) return formatted.toFixed(4);
  if (formatted < 100) return formatted.toFixed(2);
  return formatted.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export const TokenListItem = ({ token, walletAddress, isNative, onSelect }: TokenListItemProps) => {
  const { balance, decimals } = useTokenBalance({
    address: walletAddress,
    token: isNative ? undefined : token.address,
  });

  return (
    <Button
      variant="ghost"
      className="w-full justify-between py-3 px-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <TokenAvatar
            symbol={token.symbol}
            address={token.address}
            size={24}
            title={token.name || token.symbol}
          />
        </div>
        <div className="text-left">
          <div className="font-medium text-white text-sm">{token.symbol}</div>
          <div className="text-xs text-white/60">{token.name || "Unknown"}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-semibold text-white">
          {formatBalance(balance?.value, decimals)}
        </div>
        <div className="text-[10px] text-white/40 font-mono">
          {token.address ? formatAddress(token.address) : "Native"}
        </div>
      </div>
    </Button>
  );
};
