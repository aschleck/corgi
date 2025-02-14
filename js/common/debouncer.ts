export class Debouncer {

  private currentTimer: ReturnType<typeof setTimeout>|undefined;

  constructor(
      private readonly delayMs: number,
      private readonly callback: () => void) {
  }

  trigger(): Promise<void> {
    if (this.currentTimer !== undefined) {
      clearTimeout(this.currentTimer);
    }
    return new Promise((resolve, reject) => {
      this.currentTimer = setTimeout(() => {
        this.currentTimer = undefined;
        try {
          this.callback();
          resolve();
        } catch (error: unknown) {
          reject(error);
        }
      }, this.delayMs);
    });
  }
}
