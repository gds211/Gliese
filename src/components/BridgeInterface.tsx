import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpDown, ChevronDown, Wallet, Search } from "lucide-react";
import TokenAvatar from "@/components/TokenAvatar";
import { formatBalanceWithScale } from "@/lib/utils";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { Address } from "viem";

// Network configuration
const networks = [
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    icon: '🔷',
    color: '#28A0F0',
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    chainId: 43114,
    icon: '🔺',
    color: '#E84142',
  },
  {
    id: 'monad',
    name: 'Monad Testnet',
    chainId: 10143,
    icon: '⚡',
    color: '#9333EA',
  },
];

// Token configuration (YAK for now)
const bridgeToken = {
  symbol: "YAK",
  name: "Yak Token",
  address: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50" as `0x${string}`,
};

// Token balance display component
const TokenBalanceDisplay = ({ 
  tokenAddress, 
  walletAddress 
}: { 
  tokenAddress?: Address; 
  walletAddress?: Address;
}) => {
  const { formatted, isLoading } = useTokenBalance({
    address: walletAddress,
    token: tokenAddress,
  });

  if (!walletAddress) return <span className="text-xs text-white font-medium tabular-nums">0.0000</span>;
  if (isLoading) return <span className="text-xs text-white font-medium tabular-nums">...</span>;
  
  return (
    <span className="text-xs text-white font-medium tabular-nums">
      {formatted ? formatBalanceWithScale(parseFloat(formatted)) : "0.0000"}
    </span>
  );
};

const BridgeInterface = () => {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  // State
  const [fromNetwork, setFromNetwork] = useState(networks[0]);
  const [toNetwork, setToNetwork] = useState(networks[1]);
  const [amount, setAmount] = useState("");
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkSelectionType, setNetworkSelectionType] = useState<"from" | "to">("from");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter networks for modal
  const filteredNetworks = useMemo(() => {
    if (!searchTerm) return networks;
    const lower = searchTerm.toLowerCase();
    return networks.filter(
      net => 
        net.name.toLowerCase().includes(lower) ||
        net.id.toLowerCase().includes(lower)
    );
  }, [searchTerm]);

  // Handle network selection
  const handleNetworkSelect = (network: typeof networks[0]) => {
    if (networkSelectionType === "from") {
      setFromNetwork(network);
    } else {
      setToNetwork(network);
    }
    setShowNetworkModal(false);
    setSearchTerm("");
  };

  // Swap networks
  const handleSwapNetworks = () => {
    const temp = fromNetwork;
    setFromNetwork(toNetwork);
    setToNetwork(temp);
  };

  // Open network modal
  const openNetworkModal = (type: "from" | "to") => {
    setNetworkSelectionType(type);
    setShowNetworkModal(true);
  };

  // Button states
  const buttonText = useMemo(() => {
    if (!isConnected) return "Connect Wallet";
    if (!amount || Number(amount) === 0) return "Enter an amount";
    return "Bridge";
  }, [isConnected, amount]);

  const isButtonDisabled = !isConnected || !amount || Number(amount) === 0;

  const handleBridge = () => {
    if (!isConnected && openConnectModal) {
      openConnectModal();
      return;
    }
    // TODO: Implement bridge logic
    console.log("Bridge", amount, "YAK from", fromNetwork.name, "to", toNetwork.name);
  };

  return (
    <>
      <Card className="bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl w-full max-w-md mx-auto p-4 space-y-3">
        {/* Header - Bridge */}
        <div className="flex items-center justify-center mb-2">
          <h2 className="text-lg font-semibold text-foreground">Bridge</h2>
        </div>

        {/* FROM Section */}
        <div className="space-y-2">
          {/* Label & Network Selector */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-medium">From</span>
            <Button
              variant="ghost"
              onClick={() => openNetworkModal("from")}
              className="w-auto min-w-[8rem] pl-11 pr-8 h-10 bg-muted/60 rounded-full border border-white/10 hover:border-white hover:bg-muted/80 transition-all relative"
            >
              <span className="absolute left-3 text-xl">{fromNetwork.icon}</span>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {fromNetwork.name}
              </span>
              <ChevronDown className="absolute right-3 w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Token Display & Input */}
          <div className="bg-background/60 rounded-2xl border border-white/10 p-4 space-y-2">
            {/* Token Info */}
            <div className="flex items-center gap-2">
              <TokenAvatar symbol={bridgeToken.symbol} size={24} />
              <span className="font-medium text-foreground">{bridgeToken.symbol}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-background/60 text-muted-foreground border border-white/10">
                {fromNetwork.name}
              </span>
            </div>

            {/* Amount Input */}
            <div className="flex items-center justify-between gap-3">
              <Input
                type="text"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d*\.?\d*$/.test(val)) {
                    setAmount(val);
                  }
                }}
                placeholder="0.0"
                className="flex-1 bg-transparent border-none text-2xl font-medium text-foreground p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <TokenBalanceDisplay 
                  tokenAddress={bridgeToken.address}
                  walletAddress={address}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center -my-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwapNetworks}
            className="bg-background/60 hover:bg-white rounded-md border border-border/40 hover:border-2 hover:border-blue-600 transition-all w-10 h-10"
          >
            <ArrowUpDown className="w-5 h-5 text-foreground" />
          </Button>
        </div>

        {/* TO Section */}
        <div className="space-y-2">
          {/* Label & Network Selector */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-medium">To</span>
            <Button
              variant="ghost"
              onClick={() => openNetworkModal("to")}
              className="w-auto min-w-[8rem] pl-11 pr-8 h-10 bg-muted/60 rounded-full border border-white/10 hover:border-white hover:bg-muted/80 transition-all relative"
            >
              <span className="absolute left-3 text-xl">{toNetwork.icon}</span>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {toNetwork.name}
              </span>
              <ChevronDown className="absolute right-3 w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Token Display */}
          <div className="bg-background/60 rounded-2xl border border-white/10 p-4 space-y-2">
            {/* Token Info */}
            <div className="flex items-center gap-2">
              <TokenAvatar symbol={bridgeToken.symbol} size={24} />
              <span className="font-medium text-foreground">{bridgeToken.symbol}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-background/60 text-muted-foreground border border-white/10">
                {toNetwork.name}
              </span>
            </div>

            {/* Amount Display */}
            <div className="flex items-center justify-between">
              <span className="text-2xl font-medium text-foreground">
                {amount || "0.0"}
              </span>
            </div>
          </div>
        </div>

        {/* Fee Info */}
        <div className="bg-background/40 rounded-lg p-3 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount to Bridge</span>
            <span className="font-medium text-foreground">
              {amount || "0"} {bridgeToken.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Bridge Fee</span>
            <span className="font-medium text-foreground">~0.1%</span>
          </div>
        </div>

        {/* Bridge Button */}
        <Button
          onClick={handleBridge}
          disabled={isButtonDisabled}
          className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-medium text-base shadow-glow-cosmic transition-all"
        >
          {buttonText}
        </Button>
      </Card>

      {/* Network Selection Modal */}
      <Dialog open={showNetworkModal} onOpenChange={setShowNetworkModal}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border border-muted/60 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Select Network
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search networks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/60 border-white/10"
            />
          </div>

          {/* Network List */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-4">
              {filteredNetworks.map((network) => (
                <button
                  key={network.id}
                  onClick={() => handleNetworkSelect(network)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-background/60 hover:bg-background/80 border border-white/10 hover:border-white/30 transition-all"
                >
                  <span className="text-2xl">{network.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-foreground">{network.name}</div>
                    <div className="text-xs text-muted-foreground">Chain ID: {network.chainId}</div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BridgeInterface;
