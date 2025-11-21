import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBalanceWithScale(value: number): string {
  const absValue = Math.abs(value);
  
  // Handle billions
  if (absValue >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    if (absValue < 10_000_000_000) return billions.toFixed(3) + 'B';
    if (absValue < 100_000_000_000) return billions.toFixed(2) + 'B';
    return billions.toFixed(1) + 'B';
  }
  
  // Handle millions
  if (absValue >= 1_000_000) {
    const millions = value / 1_000_000;
    if (absValue < 10_000_000) return millions.toFixed(3) + 'M';
    if (absValue < 100_000_000) return millions.toFixed(2) + 'M';
    return millions.toFixed(1) + 'M';
  }
  
  // Handle regular numbers
  if (absValue >= 100_000) return value.toFixed(0);
  if (absValue >= 10_000) return value.toFixed(0);
  if (absValue >= 1_000) return value.toFixed(1);
  if (absValue >= 100) return value.toFixed(2);
  if (absValue >= 10) return value.toFixed(3);
  return value.toFixed(4);
}
