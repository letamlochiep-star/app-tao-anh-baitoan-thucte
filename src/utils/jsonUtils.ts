/**
 * Safely stringifies objects to JSON, eliminating circular structures, DOM elements, or Fiber references.
 */
export function safeJsonStringify(obj: any, space?: number): string {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (
          typeof window !== 'undefined' &&
          (value instanceof Node ||
            value instanceof Element ||
            (value.constructor && value.constructor.name && value.constructor.name.includes('Element')))
        ) {
          return undefined;
        }
        if (seen.has(value)) {
          return undefined;
        }
        seen.add(value);
      }
      return value;
    },
    space
  );
}
