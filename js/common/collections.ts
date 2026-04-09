export class DefaultMap<K, V> {

  readonly map: Map<K, V>;

  constructor(private readonly factory: (key: K) => V, elements?: Array<[K, V]>) {
    this.map = new Map(elements);
  }

  get size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  set(key: K, value: V): void {
    this.map.set(key, value);
  }

  delete(key: K): void {
    this.map.delete(key);
  }

  get(key: K): V {
    if (!this.map.has(key)) {
      this.map.set(key, this.factory(key));
    }
    return this.map.get(key) as V; // we can't use checkExists because V may include undefined
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  entries(): IterableIterator<[K, V]> {
    return this.map.entries();
  }

  forEach(callbackFn: (value: V, key: K) => void): void {
    this.map.forEach(callbackFn);
  }

  keys(): IterableIterator<K> {
    return this.map.keys();
  }

  values(): IterableIterator<V> {
    return this.map.values();
  }

  [Symbol.iterator](): Iterator<[K, V]> {
    return this.map[Symbol.iterator]();
  }
}

export class HashMap<K, V> {

  private readonly _keys: Map<unknown, K>;
  private readonly mapped: Map<unknown, V>;

  constructor(private readonly hashFn: (key: K) => unknown, elements?: Array<[K, V]>) {
    this._keys = new Map();
    this.mapped = new Map();
    for (const [key, value] of elements ?? []) {
      this.set(key, value);
    }
  }

  get size(): number {
    return this._keys.size;
  }

  clear(): void {
    this._keys.clear();
    this.mapped.clear();
  }

  set(key: K, value: V): void {
    const hash = this.hashFn(key);
    this._keys.set(hash, key);
    this.mapped.set(hash, value);
  }

  delete(key: K): void {
    const hash = this.hashFn(key);
    this._keys.delete(hash);
    this.mapped.delete(hash);
  }

  get(key: K): V|undefined {
    return this.mapped.get(this.hashFn(key));
  }

  has(key: K): boolean {
    return this.mapped.has(this.hashFn(key));
  }

  entries(): IterableIterator<[K, V]> {
    const self = this;
    return (function* () {
      for (const [hash, key] of self._keys) {
        yield [key, self.mapped.get(hash) as V] as [K, V];
      }
    })();
  }

  forEach(callbackFn: (value: V, key: K) => void): void {
    for (const [key, value] of this) {
      callbackFn(value, key);
    }
  }

  keys(): IterableIterator<K> {
    return this._keys.values();
  }

  values(): IterableIterator<V> {
    return this.mapped.values();
  }

  [Symbol.iterator](): Iterator<[K, V]> {
    const keyIterator = this._keys[Symbol.iterator]();
    return {
      next: () => {
        const {value, done} = keyIterator.next();
        if (done) {
          return {
            value: undefined,
            done,
          };
        } else {
          const [hash, key] = value;
          return {
            // We need to cast to V because the type from get is V|undefined, and we can't
            // checkExists because V itself might include undefined.
            value: [key, this.mapped.get(hash) as V],
            done: false,
          };
        }
      },
    };
  }
}

export class HashSet<V> {

  private readonly hashes: Set<unknown>;
  private readonly stored: Map<unknown, V>;

  constructor(private readonly hashFn: (value: V) => unknown, elements?: V[]) {
    this.hashes = new Set();
    this.stored = new Map();

    for (const element of elements ?? []) {
      this.add(element);
    }
  }

  get size(): number {
    return this.hashes.size;
  }

  add(value: V): void {
    const hash = this.hashFn(value);
    this.hashes.add(hash);
    this.stored.set(hash, value);
  }

  clear(): void {
    this.hashes.clear();
    this.stored.clear();
  }

  delete(value: V): void {
    const hash = this.hashFn(value);
    this.hashes.delete(hash);
    this.stored.delete(hash);
  }

  forEach(callbackFn: (value: V) => void): void {
    for (const value of this) {
      callbackFn(value);
    }
  }

  has(value: V): boolean {
    return this.hashes.has(this.hashFn(value));
  }

  values(): IterableIterator<V> {
    return this.stored.values();
  }

  [Symbol.iterator](): Iterator<V> {
    return this.stored.values();
  }
}

export class IdentitySetMultiMap<K, V> {

  private map: Map<K, V[]>;

  constructor() {
    this.map = new Map();
  }

  clear(): void {
    this.map.clear();
  }

  put(key: K, value: V): void {
    let values = this.map.get(key);
    if (values) {
      for (const element of values) {
        if (value === element) {
          return;
        }
      }
      values.push(value);
    } else {
      values = [value];
      this.map.set(key, values);
    }
  }

  delete(key: K, value: V): void {
    const values = this.map.get(key);
    if (!values) {
      return;
    }

    if (values.length === 1) {
      if (value === values[0]) {
        this.map.delete(key);
      }
    } else {
      for (let i = 0; i < values.length; ++i) {
        if (value === values[i]) {
          values.splice(i, 1);
          break;
        }
      }
    }
  }

  get(key: K): V[]|undefined {
    return this.map.get(key);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  [Symbol.iterator](): Iterator<[K, V[]]> {
    return this.map[Symbol.iterator]();
  }
}

export function getFirstElement<V>(iterable: Iterable<V>, message?: string): V {
  for (const e of iterable) {
    return e;
  }
  throw new Error(message ?? 'Iterable has no elements');
}

export function getOnlyElement<V>(c: Iterable<V>, message?: string): V {
  const iterator = c[Symbol.iterator]();
  const first = iterator.next();
  if (first.done) {
    throw new Error(message ?? 'Expected exactly one element, but iterable was empty');
  }
  const second = iterator.next();
  if (!second.done) {
    throw new Error(message ?? 'Expected exactly one element, but iterable had multiple elements');
  }
  return first.value;
}
