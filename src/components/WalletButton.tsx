import { Button } from "@/components/ui/button";
import { useAccount, useChainId } from "wagmi";
import { useConnectModal, useAccountModal, useChainModal } from "@rainbow-me/rainbowkit";
import { PUBLIC_CONFIG } from "@/config/public";

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();

  const short = (addr?: string) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "");

  // Not connected -> open RainbowKit Connect modal
  if (!isConnected) {
    return (
      <Button
        onClick={() => openConnectModal?.()}
        className="bg-primary text-primary-foreground shadow-glow-cosmic hover:scale-105"
        type="button"
      >
        Connect Wallet
      </Button>
    );
  }

  // Wrong network -> open RainbowKit Chain modal
  const wrongNetwork = chainId && chainId !== PUBLIC_CONFIG.CHAIN_ID;
  if (wrongNetwork) {
    return (
      <Button
        onClick={() => openChainModal?.()}
        variant="destructive"
        className="shadow-glow-cosmic"
        type="button"
      >
        Wrong network — Switch
      </Button>
    );
  }

  // Connected & on correct network -> open RainbowKit Account modal
  return (
    <Button
      onClick={() => openAccountModal?.()}
      className="bg-primary text-primary-foreground shadow-glow-cosmic"
      type="button"
    >
      {short(address)}
    </Button>
  );
}
