export class Debouncer {

  private currentTimer: ReturnType<typeof setTimeout>|undefined;
  // One promise per pending flush window. Every `trigger()` while a
  // flush is already pending observes the same resolution — so a stream
  // of awaiting callers (e.g. `await debouncer.trigger()` inside a high-
  // frequency event handler) all unblock together once the eventual
  // callback fires. Without this, a subsequent trigger clears the prior
  // timer and orphans its `resolve` closure, leaving every earlier
  // `await` pending forever.
  private pending: {
    promise: Promise<void>;
    resolve: () => void;
    reject: (e: unknown) => void;
  } | undefined;

  constructor(
      private readonly delayMs: number,
      private readonly callback: () => void) {
  }

  trigger(): Promise<void> {
    if (this.currentTimer !== undefined) {
      clearTimeout(this.currentTimer);
    }
    if (this.pending === undefined) {
      let resolve!: () => void;
      let reject!: (e: unknown) => void;
      const promise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      this.pending = {promise, resolve, reject};
    }
    const pending = this.pending;
    this.currentTimer = setTimeout(() => {
      this.currentTimer = undefined;
      this.pending = undefined;
      try {
        this.callback();
        pending.resolve();
      } catch (error: unknown) {
        pending.reject(error);
      }
    }, this.delayMs);
    return pending.promise;
  }
}
