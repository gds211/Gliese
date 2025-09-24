import { Address } from 'viem';
import { PUBLIC_CONFIG } from '@/config/public';

export interface Token {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// Native MON token
export const NATIVE_TOKEN: Token = {
  address: '0x0000000000000000000000000000000000000000' as Address,
  symbol: PUBLIC_CONFIG.NATIVE_SYMBOL,
  name: 'Monad',
  decimals: PUBLIC_CONFIG.NATIVE_DECIMALS,
};

// Wrapped MON token
export const WRAPPED_NATIVE: Token = {
  address: PUBLIC_CONFIG.WRAPPED_NATIVE as Address,
  symbol: 'WMON',
  name: 'Wrapped Monad',
  decimals: 18,
};

// Example tokens on Monad testnet
export const SUPPORTED_TOKENS: Token[] = [
  NATIVE_TOKEN,
  WRAPPED_NATIVE,
  {
    address: '0xb2f82D0f38dc453D596Ad40A37799446Cc89274A' as Address,
    symbol: 'aprMON',
    name: 'April MON',
    decimals: 18,
  },
  {
    address: '0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714' as Address,
    symbol: 'GAK',
    name: 'GAK Token',
    decimals: 18,
  },
  {
    address: '0xE0590015A873bF326bd645c3E1266d4db41C4E6B' as Address,
    symbol: 'CHOG',
    name: 'CHOG Token',
    decimals: 18,
  },
];

export const getTokenByAddress = (address: Address): Token | undefined => {
  return SUPPORTED_TOKENS.find(
    token => token.address.toLowerCase() === address.toLowerCase()
  );
};

export const getTokenBySymbol = (symbol: string): Token | undefined => {
  return SUPPORTED_TOKENS.find(
    token => token.symbol.toLowerCase() === symbol.toLowerCase()
  );
};

export const isNativeToken = (token: Token): boolean => {
  return token.address === NATIVE_TOKEN.address;
};