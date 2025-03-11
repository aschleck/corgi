export function approxEqual(a: number, b: number, epsilon: number): boolean {
  return Math.abs(a - b) < epsilon;
}

export function approxGtOrEqual(a: number, b: number, epsilon: number): boolean {
  return a > b || approxEqual(a, b, epsilon);
}

export function approxLtOrEqual(a: number, b: number, epsilon: number): boolean {
  return a < b || approxEqual(a, b, epsilon);
}

export function deepEqual(a: unknown|undefined, b: unknown|undefined): boolean {
  // We need to be careful not to compare objects that reference themselves recursively forever
  const recursiveCache = new WeakMap<object, object>();
  return realDeepEqual(a, b, recursiveCache);
}

function realDeepEqual(
    a: unknown|undefined, b: unknown|undefined, recursiveCache: WeakMap<object, object>): boolean {
  if (a === b) {
    return true;
  } else if (a instanceof Array && b instanceof Array) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; ++i) {
      if (!realDeepEqual(a[i], b[i], recursiveCache)) {
        return false;
      }
    }
    return true;
  } else if (a instanceof Function || b instanceof Function) {
    return a === b;
  } else if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) {
      return false;
    }
    const ak = new Set(a.keys());
    const bk = new Set(b.keys());
    for (const key of ak) {
      if (!bk.has(key)) {
        return false;
      }
      bk.delete(key);
    }
    if (bk.size > 0) {
      return false;
    }
    for (const key of ak) {
      if (!realDeepEqual(a.get(key), b.get(key), recursiveCache)) {
        return false;
      }
    }
    return true;
  } else if (a instanceof Object && b instanceof Object) {
    const alreadySeen = recursiveCache.get(a);
    if (alreadySeen === b) {
      return true;
    } else {
      recursiveCache.set(a, b);
    }

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
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
    recursiveCache.delete(a);
    return true;
  }
  return false;
}

