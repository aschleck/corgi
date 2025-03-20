export interface Future<T> extends Promise<T> {
  finished: boolean;
  ok: boolean;
  catch<TResult>(onRejected: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined): Future<T | TResult>;
  finally(fn: (() => void) | null | undefined): Future<T>;
  then<TResult1, TResult2>(
    onResolved?: ((v: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): Future<TResult1>;
  error: () => unknown;
  value: () => T;
}

export function asFuture<T>(p: Promise<T>): Future<T> {
  const f = new Promise((resolve, reject) => {
    p.then(v => {
      f.finished = true;
      f.ok = true;
      f.error = () => { throw "Future settled successfully"; };
      f.value = () => v;
      resolve(v);
    }).catch(e => {
      f.finished = true;
      f.ok = false;
      f.error = () => e;
      f.value = () => { throw e; };
      reject(e);
    });
  }) as Future<T>;

  f.finished = false;
  f.ok = false;
  f.error = () => {
    throw new Error("Future hasn't yet settled");
  };
  f.value = () => {
    throw new Error("Future hasn't yet settled");
  };
  f.catch = function<TResult>(
    onRejected: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined
  ) {
    if (this.finished && onRejected) {
      if (this.ok) {
        return this;
      } else {
        const result = onRejected(this.error());
        if (result instanceof Promise) {
          const maybeFuture = result as Future<any>|Promise<any>;
          if ('error' in maybeFuture) {
            return maybeFuture;
          } else {
            return asFuture(result);
          }
        } else {
          return rejectedFuture(result);
        }
      }
    } else {
      return asFuture(p.catch(onRejected));
    }
  };
  f.finally = function(fn) {
    return asFuture(p.finally(fn));
  };
  f.then = function(onResolved, onRejected) {
    if (this.finished && this.ok && onResolved) {
      if (this.ok && onResolved) {
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
      } else if (!this.ok && onRejected) {
        const result = onRejected(this.error());
        if (result instanceof Promise) {
          const maybeFuture = result as Future<any>|Promise<any>;
          if ('error' in maybeFuture) {
            return maybeFuture;
          } else {
            return asFuture(result);
          }
        } else {
          return rejectedFuture(result);
        }
      }
    }

    return asFuture(p.then(onResolved, onRejected));
  };

  return f;
}

export function resolvedFuture<T>(value: T): Future<T> {
  const f = asFuture<T>(Promise.resolve(value));
  // Ensure these are set *now*
  f.finished = true;
  f.ok = true;
  f.error = () => { throw "Future settled successfully"; };
  f.value = () => value;
  return f;
}

export function rejectedFuture<T>(reason: unknown): Future<T> {
  const f = asFuture<T>(Promise.reject(reason));
  // Ensure these are set *now*
  f.finished = true;
  f.ok = false;
  f.error = () => reason;
  f.value = () => { throw reason; };
  return f;
}

export function unsettledFuture<T>(): Future<T> {
  return asFuture(new Promise(() => {}));
}
