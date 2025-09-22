import { Button } from "@/components/ui/button";
import { useAccount, useConnect, useDisconnect } from 'wagmi';

const WalletButton = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <Button 
        variant="outline"
        onClick={() => disconnect()}
        className="bg-card/70 text-foreground hover:bg-secondary/50 border-border/20"
      >
        {formatAddress(address)}
      </Button>
    );
  }

  return (
    <Button 
      variant="default"
      onClick={() => connect({ connector: connectors[0] })}
      className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-cosmic transition-all duration-300 hover:scale-105"
    >
      Connect Wallet
    </Button>
  );
};

export default WalletButton;