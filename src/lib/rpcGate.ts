* The task is awaited exclusively; any error is rethrown after releasing the gate.
 */
export async function withRpcGate<T>(task: () => Promise<T>, _label: string = "rpc"): Promise<T> {
  // Chain a void promise to the tail. Each task waits for the previous to finish.
  let release: () => void;
  const next = new Promise<void>((resolve) => (release = resolve));
  const prev = tail;
  tail = prev.then(() => next);
  await prev;
  try {
    return await task();
  } finally {
    // Always release so the queue cannot deadlock on errors.
    release!();
  }
}

// Convenience wrappers (strongly-typed generics where reasonable)
export async function readContractWithGate<T = any>(client: any, args: any, label: string = "readContract"): Promise<T> {
  return withRpcGate(() => (client as any).readContract(args) as Promise<T>, label);
}

export async function estimateFeesPerGasWithGate(client: any, args?: any): Promise<any> {
  return withRpcGate(() => (client as any).estimateFeesPerGas(args ?? {}) as Promise<any>, "fees.estimate");
}

export async function getGasPriceWithGate(client: any): Promise<bigint> {
  return withRpcGate(() => (client as any).getGasPrice() as Promise<bigint>, "fees.legacy");
}

export async function getBlockWithGate<T = any>(client: any, args: any): Promise<T> {
  return withRpcGate(() => (client as any).getBlock(args) as Promise<T>, "block.get");
}
