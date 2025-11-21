// src/hooks/useDebouncedValue.ts
import { useEffect, useState } from "react";

/**
 * Returns a debounced version of `value`.
 * Used to avoid hammering remote APIs while the user is typing.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 250): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      clearTimeout(handle);
    };
  }, [value, delayMs]);

  return debounced;
}
