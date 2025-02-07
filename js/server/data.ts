import { deepEqual } from '../common/comparisons';
import { Future, resolvedFuture } from '../common/futures';

import { DataKey, requestDataBatch as ssrRequestDataBatch, initialData } from './ssr_aware';

type AsObjects<T extends string[]> = {[K in keyof T]: object};
type KeyedTuples<T extends string[]> = {[K in keyof T]: [T[K], object]};

const MAX_CACHE_ENTRIES = process.env.CORGI_FOR_BROWSER ? 10 : 0;
const cache: Array<[key: DataKey, response: object]> = initialData();

export function fetchDataBatch<T extends string[]>(tuples: KeyedTuples<T>):
    Future<AsObjects<T>> {
  const missing: DataKey[] = [];
  const missingIndices: number[] = [];
  const data: object[] = [];
  for (let i = 0; i < tuples.length; ++i) {
    const [method, request] = tuples[i];
    const cached = getCache(method, request);
    if (cached) {
      data[i] = cached;
      continue;
    }

    missing.push({method, request});
    missingIndices.push(i);
  }

  if (missing.length === 0) {
    return resolvedFuture(data as AsObjects<T>);
  } else {
    return ssrRequestDataBatch(missing)
        .then(response => {
          for (let i = 0; i < response.length; ++i) {
            const value = response[i];
            data[missingIndices[i]] = value;
            cache.push([missing[i], value]);
          }
          if (cache.length > MAX_CACHE_ENTRIES) {
            cache.splice(0, cache.length - MAX_CACHE_ENTRIES);
          }
          return data as AsObjects<T>;
        });
  }
}

// TODO(april): figure out whether to deduplicate this with fetchDataBatch and how... And maybe
// upstream the better proto stuff?
// Caching in fetchDataBatch doesn't make sense because the outer fetchData call return from the
// cache there and it's more immediate and more resolvedFuture compatible.
export function requestDataBatch<T extends string[]>(tuples: KeyedTuples<T>):
    Future<AsObjects<T>> {
  const missing: DataKey[] = [];
  const missingIndices: number[] = [];
  const data: object[] = Array(tuples.length);
  for (let i = 0; i < tuples.length; ++i) {
    const [method, request] = tuples[i];
    missing.push({method, request});
    missingIndices.push(i);
  }

  return ssrRequestDataBatch(missing)
      .then(response => {
        for (let i = 0; i < response.length; ++i) {
          const value = response[i];
          data[missingIndices[i]] = value;
          cache.push([missing[i], value]);
        }
        if (cache.length > MAX_CACHE_ENTRIES) {
          cache.splice(0, cache.length - MAX_CACHE_ENTRIES);
        }
        return data as AsObjects<T>;
      });
}

export function getCache(method: string, request: object): object|undefined {
  let cached = -1;
  const key = {method, request};
  for (let i = cache.length - 1; i >= 0; --i) {
    if (deepEqual(cache[i][0], key)) {
      cached = i;
      break;
    }
  }

  if (cached >= 0) {
    const entry = cache[cached];
    cache.splice(cached, 1);
    cache.push(entry);
    return entry[1];
  } else {
    return undefined;
  }
}

export function invalidateCache(
    invalidator: (method: string, request: object, response: object) => boolean): void {
  const cleansed: typeof cache = [];
  for (const [{method, request}, response] of cache) {
    if (!invalidator(method, request, response)) {
      cleansed.push([{method, request}, response]);
    }
  }
  cache.length = 0;
  cache.push(...cleansed);
}

export function putCache(method: string, request: object, response: object) {
  cache.push([{method, request}, response]);
}
