/**
 * Utility functions for localized number formatting
 * European format: thousands separator with dots, decimal separator with comma
 * Example: 1.234,56
 */

/**
 * Normalizes user input to standard decimal format (dots for decimals)
 * Converts \"1.000,50\" or \"1000,50\" to \"1000.50\"
 */
export function normalizeInput(input: string): string {
  if (!input) return '';
  
  // Remove all spaces
  let normalized = input.replace(/\s/g, '');
  
  // Handle European format: last comma is decimal separator
  const lastCommaIndex = normalized.lastIndexOf(',');
  const lastDotIndex = normalized.lastIndexOf('.');
  
  if (lastCommaIndex > lastDotIndex) {
    // Last comma is decimal separator
    // Replace all dots with empty string (thousands separators)
    // Replace last comma with dot (decimal separator)
    normalized = normalized.substring(0, lastCommaIndex).replace(/[.,]/g, '') + 
                 '.' + normalized.substring(lastCommaIndex + 1);
  } else if (lastDotIndex > lastCommaIndex) {
    // Last dot is decimal separator (standard format)
    // Remove all commas (thousands separators)
    normalized = normalized.replace(/,/g, '');
  } else {
    // No decimal separator, just remove commas and dots that are thousands separators
    // If only one comma or dot, treat as decimal separator
    const commaCount = (normalized.match(/,/g) || []).length;
    const dotCount = (normalized.match(/\./g) || []).length;
    
    if (commaCount === 1 && dotCount === 0) {
      normalized = normalized.replace(',', '.');
    } else if (commaCount === 0 && dotCount === 1) {
      // Keep as is
    } else {
      // Multiple separators, remove all (treat as thousands separators)
      normalized = normalized.replace(/[.,]/g, '');
    }
  }
  
  return normalized;
}

/**
 * Formats a number to European format with thousands dots and decimal comma
 * Example: 1234.56 -> \"1.234,56\"
 */
export function formatLocalizedNumber(value: string | number, maxDecimals = 6): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  
  // Format with standard JS (dots for decimals)
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
    useGrouping: false
  });
  
  // Split into integer and decimal parts
  const parts = formatted.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '';
  
  // Add thousands separators (dots) to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Combine with comma as decimal separator
  if (decimalPart) {
    // Remove trailing zeros from decimal part
    const cleanDecimal = decimalPart.replace(/0+$/, '');
    return cleanDecimal ? `${formattedInteger},${cleanDecimal}` : formattedInteger;
  }
  
  return formattedInteger;
}

/**
 * Parses a localized number string back to a standard number
 * Example: \"1.234,56\" -> 1234.56
 */
export function parseLocalizedNumber(localizedValue: string): number {
  const normalized = normalizeInput(localizedValue);
  return parseFloat(normalized) || 0;
}
