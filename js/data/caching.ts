import {Message} from '@bufbuild/protobuf';

import {deepEqual} from '../common/comparisons';

const MAX_CACHE_ENTRIES = process.env.CORGI_FOR_BROWSER ? 10 : 0;
const cache: Array<[key: {method: string; request: Message}, response: Message]> = [];

export function getCache(method: string, request: Message): Message|undefined {
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
    invalidator: (method: string, request: Message, response: Message) => boolean): void {
  const cleansed: typeof cache = [];
  for (const [{method, request}, response] of cache) {
    if (!invalidator(method, request, response)) {
      cleansed.push([{method, request}, response]);
    }
  }
  cache.length = 0;
  cache.push(...cleansed);
}

export function putCache(method: string, request: Message, response: Message) {
  cache.push([{method, request}, response]);
  if (cache.length > MAX_CACHE_ENTRIES) {
    cache.splice(0, cache.length - MAX_CACHE_ENTRIES);
  }
}
