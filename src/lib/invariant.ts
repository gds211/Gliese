/**
 * Assert that a condition is truthy, throwing an error if not.
 * Useful for runtime assertions and type narrowing.
 */
export function invariant(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(`Invariant failed: ${message}`);
  }
}

/**
 * Assert that a value is not null or undefined.
 * Useful for type narrowing after null checks.
 */
export function assertExists<T>(
  value: T | null | undefined,
  message = 'Expected value to exist'
): asserts value is T {
  invariant(value != null, message);
}