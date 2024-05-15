export interface Future<T> extends Promise<T> {
  finished: boolean;
  ok: boolean;
  catch<TResult>(onRejected: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined): Future<T | TResult>;
  finally(fn: (() => void) | null | undefined): Future<T>;
  then<TResult1, TResult2>(
    onResolved?: ((v: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): Future<TResult1>;
  value: () => T;
}

export function asFuture<T>(p: Promise<T>): Future<T> {
  const f = new Promise((resolve, reject) => {
    p.then(v => {
      f.ok = true;
      f.value = () => v;
      resolve(v);
    }).catch(e => {
      f.ok = false;
      f.value = () => {
        throw e;
      };
      reject(e);
    }).finally(() => {
      f.finished = true;
    });
  }) as Future<T>;

  f.finished = false;
  f.ok = false;
  f.value = () => {
    throw new Error("Future hasn't yet settled");
  };
  f.catch = function<TResult>(fn: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined) {
    return asFuture(p.catch(fn));
  };
  f.finally = function(fn) {
    return asFuture(p.finally(fn));
  };
  f.then = function(onResolved, onRejected) {
    if (this.finished && this.ok && onResolved) {
      const result = onResolved(this.value());
      if (result instanceof Promise) {
        const maybeFuture = result as Future<any>|Promise<any>;
        if ('value' in maybeFuture) {
          return maybeFuture;
        } else {
          return asFuture(result);
        }
      } else {
        return resolvedFuture(result);
      }
    } else {
      return asFuture(p.then(onResolved, onRejected));
    }
  };

  return f;
}

export function resolvedFuture<T>(value: T): Future<T> {
  const f = asFuture<T>(Promise.resolve(value));
  // Ensure these are set *now*
  f.finished = true;
  f.ok = true;
  f.value = () => value;
  return f;
}

export function unsettledFuture<T>(): Future<T> {
  return asFuture(new Promise(() => {}));
}
