import { Disposable } from './disposable';

export class Timer extends Disposable {

  private current: ReturnType<typeof setTimeout>|undefined;

  constructor(
      private readonly delayMs: number,
      private readonly callback: () => void) {
    super();
    this.registerDisposer(() => {
      this.stop();
    });
  }

  start(): void {
    this.stop();
    this.current = setTimeout(() => {
      this.fire();
    }, this.delayMs);
  }

  stop(): void {
    if (this.current !== undefined) {
      clearTimeout(this.current);
      this.current = undefined;
    }
  }

  private fire(): void {
    const armed = this.current;
    this.callback();

    // If callback() ended up calling stop() (or start()) then we want to bail out here
    if (this.current !== armed) {
      return;
    }

    this.current = setTimeout(() => {
      this.fire();
    }, this.delayMs);
  }
}
