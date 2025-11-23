import WormholeConnect from "@wormhole-foundation/wormhole-connect";

export default function WormholeBridge() {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl rounded-xl p-6">
        <WormholeConnect />
      </div>
    </div>
  );
}
