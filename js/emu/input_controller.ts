import { Controller, Response } from '../corgi/controller';
import { EmptyDeps } from '../corgi/deps';
import { CorgiEvent, DOM_KEYBOARD } from '../corgi/events';

import { ACTION, CHANGED, FOCUSED, PRESSED, UNFOCUSED } from './events';

interface Args {
  value: string|undefined;
}

export interface State {
  managed: boolean;
}

export class InputController extends Controller<Args, EmptyDeps, HTMLInputElement, State> {

  private lastValue: string;

  constructor(response: Response<InputController>) {
    super(response);
    this.lastValue = this.root.value;

    // In most cases this controller will wake up when the value changes, so root.value will already
    // be updated and we need to trigger a change.
    if (this.lastValue !== (response.args.value ?? '')) {
      this.trigger(CHANGED, {value: this.value});
    }
  }

  get value(): string {
    return this.root.value;
  }

  focused(): void {
    this.trigger(FOCUSED, {});
  }

  unfocused(): void {
    this.trigger(UNFOCUSED, {});
  }

  async keyPressed(e: CorgiEvent<typeof DOM_KEYBOARD>): Promise<void> {
    if (e.detail.key === 'Enter') {
      this.trigger(ACTION, {});
    } else if (this.lastValue !== this.value) {
      this.lastValue = this.value;
      if (this.state.managed) {
        await this.updateState({
          managed: false,
        });
      }
      this.trigger(CHANGED, {value: this.value});
    } else {
      this.trigger(PRESSED, {key: e.detail.key});
    }
  }
}
