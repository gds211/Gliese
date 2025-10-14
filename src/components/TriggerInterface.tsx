import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Wallet } from "lucide-react";
import TokenAvatar from "@/components/TokenAvatar";
import { useAccount, useBalance } from "wagmi";

interface Token {
  symbol: string;
  name: string;
  address?: `0x${string}`;
}

interface TriggerInterfaceProps {
  tokens: Token[];
}

const TriggerInterface = ({ tokens }: TriggerInterfaceProps) => {
  const { address, isConnected } = useAccount();
  
  const [payToken, setPayToken] = useState("MON");
  const [receiveToken, setReceiveToken] = useState("USDC");
  const [payAmount, setPayAmount] = useState("");
  const [rate, setRate] = useState("");
  const [expiry, setExpiry] = useState("7");

  const selectedPayToken = useMemo(
    () => tokens.find((t) => t.symbol === payToken),
    [tokens, payToken]
  );
  
  const selectedReceiveToken = useMemo(
    () => tokens.find((t) => t.symbol === receiveToken),
    [tokens, receiveToken]
  );

  const isNativePay = useMemo(
    () => !!selectedPayToken && (selectedPayToken.symbol === "MON" || !selectedPayToken.address),
    [selectedPayToken]
  );

  const { data: payBalance } = useBalance({
    address,
    token: isNativePay ? undefined : (selectedPayToken?.address as `0x${string}` | undefined),
    query: { enabled: Boolean(isConnected && address && selectedPayToken) },
  });

  const isNativeReceive = useMemo(
    () => !!selectedReceiveToken && (selectedReceiveToken.symbol === "MON" || !selectedReceiveToken.address),
    [selectedReceiveToken]
  );

  const { data: receiveBalance } = useBalance({
    address,
    token: isNativeReceive ? undefined : (selectedReceiveToken?.address as `0x${string}` | undefined),
    query: { enabled: Boolean(isConnected && address && selectedReceiveToken) },
  });

  const handleSwapTokens = () => {
    const temp = payToken;
    setPayToken(receiveToken);
    setReceiveToken(temp);
    setPayAmount("");
    setRate("");
  };

  const handleMax = () => {
    if (payBalance) {
      setPayAmount(payBalance.formatted);
    }
  };

  const handleHalf = () => {
    if (payBalance) {
      const half = (Number(payBalance.formatted) / 2).toString();
      setPayAmount(half);
    }
  };

  const calculateReceiveAmount = () => {
    if (!payAmount || !rate) return "0";
    const amount = Number(payAmount) * Number(rate);
    return amount.toFixed(6);
  };

  const payUsdValue = payAmount ? `~$${(Number(payAmount) * 1).toFixed(2)}` : "~$0.00";
  const receiveUsdValue = calculateReceiveAmount() 
    ? `~$${Number(calculateReceiveAmount()).toFixed(2)}` 
    : "~$0.00";

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (!payAmount || payAmount === "0" || Number(payAmount) === 0) return "Enter an amount";
    if (!rate || rate === "0" || Number(rate) === 0) return "Enter an amount";
    return "Place trigger order";
  };

  return (
    <div className="space-y-3">
      {/* You pay section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Paying</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              {payBalance ? `${Number(payBalance.formatted).toFixed(4)} ${payToken}` : `0.0000 ${payToken}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-xs text-muted-foreground bg-background/40 hover:bg-background/40 border border-border/40 hover:border-orange-500 hover:text-orange-500 transition-all duration-200 rounded"
              onClick={handleHalf}
            >
              HALF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-xs text-muted-foreground bg-background/40 hover:bg-background/40 border border-border/40 hover:border-orange-500 hover:text-orange-500 transition-all duration-200 rounded"
              onClick={handleMax}
            >
              MAX
            </Button>
          </div>
        </div>

        <Card className="p-4 bg-card/50 border-border">
          <div className="flex items-center justify-between gap-3">
            <Select value={payToken} onValueChange={setPayToken}>
              <SelectTrigger className="w-[140px] bg-muted/50 border-border">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <TokenAvatar symbol={payToken} size={20} />
                    <span>{payToken}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {tokens.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    <div className="flex items-center gap-2">
                      <TokenAvatar symbol={token.symbol} size={20} />
                      <span>{token.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1 text-right">
              <Input
                type="text"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0"
                className="text-right text-2xl font-semibold bg-transparent border-none focus-visible:ring-0 p-0 h-auto"
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-muted-foreground">
              {selectedPayToken?.name || ""}
            </span>
            <span className="text-xs text-muted-foreground">{payUsdValue}</span>
          </div>
        </Card>
      </div>

      {/* You receive section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Receiving</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Wallet className="h-3 w-3" />
            {receiveBalance ? `${Number(receiveBalance.formatted).toFixed(4)} ${receiveToken}` : `0.0000 ${receiveToken}`}
          </span>
        </div>

        <Card className="p-4 bg-card/50 border-border">
          <div className="flex items-center justify-between gap-3">
            <Select value={receiveToken} onValueChange={setReceiveToken}>
              <SelectTrigger className="w-[140px] bg-muted/50 border-border">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <TokenAvatar symbol={receiveToken} size={20} />
                    <span>{receiveToken}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {tokens.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    <div className="flex items-center gap-2">
                      <TokenAvatar symbol={token.symbol} size={20} />
                      <span>{token.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1 text-right">
              <div className="text-2xl font-semibold">
                {calculateReceiveAmount()}
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-muted-foreground">
              {selectedReceiveToken?.name || ""}
            </span>
            <span className="text-xs text-muted-foreground">{receiveUsdValue}</span>
          </div>
        </Card>
      </div>

      {/* Rate section */}
      <Card className="p-4 bg-card/50 border-border space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Pay {payToken} at rate
              </span>
              <span className="text-xs text-green-500">(+0.03%)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-primary hover:text-primary"
            >
              Set to market
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0"
              className="flex-1 bg-muted/50 border-border"
            />
            <span className="text-sm text-muted-foreground">{receiveToken}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Expires in</span>
          <Select value={expiry} onValueChange={setExpiry}>
            <SelectTrigger className="w-[120px] bg-muted/50 border-border">
              <SelectValue>
                {expiry === "1" ? "1 Day" : `${expiry} Days`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="1">1 Day</SelectItem>
              <SelectItem value="3">3 Days</SelectItem>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="14">14 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Create order button */}
      <Button
        className="w-full"
        disabled={!isConnected || !payAmount || !rate}
      >
        {getButtonText()}
      </Button>
    </div>
  );
};

export default TriggerInterface;
