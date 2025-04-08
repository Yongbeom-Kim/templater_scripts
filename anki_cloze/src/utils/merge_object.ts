/**
 * Recursively merge two objects. The second object takes precedence over the first.
 */
export function mergeObject<T extends Record<string, any>>(
  first: T,
  second: Partial<T> | undefined | null,
): T {
  if (second === undefined || second === null) {
    return first;
  }
  const result = { ...first };
  for (const key in second) {
    if (second.hasOwnProperty(key)) {
      if (typeof first[key] === "object" && typeof second[key] === "object") {
        result[key] = mergeObject(first[key], second[key]);
      } else {
        result[key] = second[key] as T[Extract<keyof T, string>];
      }
    }
  }
  return result;
}
