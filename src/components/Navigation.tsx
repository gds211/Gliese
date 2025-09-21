import { useAccount } from 'wagmi';
import { useConnectModal, useAccountModal, useChainModal } from '@rainbow-me/rainbowkit';

export default function Navigation() {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();

  return (
    <nav className="flex items-center justify-between p-4">
      <div className="font-semibold">Yak Aggregator</div>

      {!isConnected ? (
        <button onClick={openConnectModal} className="rounded-2xl px-4 py-2 bg-black text-white hover:opacity-90">
          Connect Wallet
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={openChainModal} className="rounded-xl px-3 py-2 border">Network</button>
          <button onClick={openAccountModal} className="rounded-2xl px-3 py-2 border" title={address}>
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </button>
        </div>
      )}
    </nav>
  );
}