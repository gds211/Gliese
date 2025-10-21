// src/lib/rpcGate.ts
// Global, in-process RPC gate to ensure heavy calls never overlap.

let tail: Promise<void> = Promise.resolve();

export async function withRpcGate<T>(task: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const next = new Promise<void>((resolve) => { release = resolve; });
  const prev = tail;
  tail = prev.then(() => next);
  await prev;
  try {
    return await task();
  } finally {
    release();
  }
}

export async function readContractWithGate<T = unknown>(client: any, args: any): Promise<T> {
  return withRpcGate(() => (client as any).readContract(args) as Promise<T>);
}

export async function estimateFeesPerGasWithGate(client: any, args?: any): Promise<any> {
  return withRpcGate(() => (client as any).estimateFeesPerGas(args ?? {}));
}

export async function getGasPriceWithGate(client: any): Promise<bigint> {
  return withRpcGate(() => (client as any).getGasPrice() as Promise<bigint>);
}

export async function getBlockWithGate<T = any>(client: any, args: any): Promise<T> {
  return withRpcGate(() => (client as any).getBlock(args) as Promise<T>);
}
