import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TokenAvatarProps {
  symbol?: string;
  address?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export const TokenAvatar: React.FC<TokenAvatarProps> = ({
  symbol = '',
  address,
  size = 'md',
  className,
}) => {
  // Generate token image URL from assets/tokens directory
  const getTokenImageUrl = (tokenSymbol: string) => {
    if (!tokenSymbol) return null;
    return `/src/assets/tokens/${tokenSymbol.toLowerCase()}.png`;
  };

  // Generate fallback text from symbol
  const getFallbackText = (tokenSymbol: string) => {
    if (!tokenSymbol) return '?';
    return tokenSymbol.slice(0, 2).toUpperCase();
  };

  const imageUrl = getTokenImageUrl(symbol);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {imageUrl && (
        <AvatarImage 
          src={imageUrl} 
          alt={`${symbol} token`}
          onError={(e) => {
            // Hide broken image on error
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <AvatarFallback className="text-xs font-medium bg-muted text-muted-foreground">
        {getFallbackText(symbol)}
      </AvatarFallback>
    </Avatar>
  );
};