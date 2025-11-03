export function approxEqual(a: number, b: number, epsilon: number): boolean {
  return Math.abs(a - b) < epsilon;
}

export function approxGtOrEqual(a: number, b: number, epsilon: number): boolean {
  return a > b || approxEqual(a, b, epsilon);
}

export function approxLtOrEqual(a: number, b: number, epsilon: number): boolean {
  return a < b || approxEqual(a, b, epsilon);
}

// TODO(april): since deepEqual is sync would we ever need more than 1?
const MAX_CACHE_POOL_SIZE = 1;
const recursiveCachePool: Map<object, object>[] = [];

export function deepEqual(a: unknown|null|undefined, b: unknown|null|undefined): boolean {
  // Fast path for same reference and primitive equality
  if (a === b) {
    return true;
  }

  // Fast path for null/undefined
  if ((a === null || b === null) || (a === undefined || b === undefined)) {
    return false;
  }

  // Fast path for different types
  const typeA = typeof a;
  const typeB = typeof b;
  if (typeA !== typeB) {
    return false;
  }

  // Fast path for primitives (already handled strict equality above, so they're different)
  if (typeA !== 'object' || typeB !== 'object') {
    return false;
  }

  // We use a Map to catch cases of recursion
  const recursiveCache = recursiveCachePool.pop() ?? new Map();
  try {
    return realDeepEqual(a, b, recursiveCache);
  } finally {
    recursiveCache.clear();
    recursiveCachePool.push(recursiveCache);
  }
}

function realDeepEqual(
    a: unknown|null|undefined,
    b: unknown|null|undefined,
    recursiveCache: Map<object, object>,
): boolean {
  // Fast path for same reference and primitive equality
  if (a === b) {
    return true;
  }

  // Fast path for null/undefined
  if ((a === null || b === null) || (a === undefined || b === undefined)) {
    return false;
  }

  // Fast path for different types
  const typeA = typeof a;
  const typeB = typeof b;
  if (typeA !== typeB) {
    return false;
  }

  // Fast path for primitives (already handled strict equality above, so they're different)
  if (typeA !== 'object' || typeB !== 'object') {
    return false;
  }

  // Check for circular references
  const alreadySeen = recursiveCache.get(a as object);
  if (alreadySeen === b) {
    return true;
  }
  recursiveCache.set(a as object, b as object);

  // Fast path for arrays
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; ++i) {
      if (!realDeepEqual(a[i], b[i], recursiveCache)) {
        return false;
      }
    }
    return true;
  }

  // Fast path for functions
  if (a instanceof Function || b instanceof Function) {
    return false; // we already checked for a === b above
  }

  // Fast path for Maps
  if (a instanceof Map) {
    if (!(b instanceof Map) || a.size !== b.size) {
      return false;
    }
    for (const [key, value] of a) {
      if (!b.has(key) || !realDeepEqual(value, b.get(key), recursiveCache)) {
        return false;
      }
    }
    return true;
  }

  // Fast path for Sets
  if (a instanceof Set) {
    if (!(b instanceof Set) || a.size !== b.size) {
      return false;
    }
    for (const value of a) {
      if (!b.has(value)) {
        return false;
      }
    }
    return true;
  }

  // Fast path for Dates
  if (a instanceof Date) {
    return b instanceof Date && a.getTime() === b.getTime();
  }

  // Fast path for RegExp
  if (a instanceof RegExp) {
    return b instanceof RegExp && a.source === b.source && a.flags === b.flags;
  }

  // Generic object comparison
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  // Fast path for different key counts
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  // Check all keys and values
  for (const key of aKeys) {
    if (!b.hasOwnProperty(key)) {
      return false;
    }
    const aValue = (a as {[k: string]: unknown})[key];
    const bValue = (b as {[k: string]: unknown})[key];
    if (!realDeepEqual(aValue, bValue, recursiveCache)) {
      return false;
    }
  }

  return true;
}

