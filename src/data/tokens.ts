export type Token = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  logoURI?: string;
};

export const TOKENS: Token[] = [
  { symbol: 'WMON', name: 'Wrapped MON', address: '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin',    address: '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea', decimals: 6 },
];