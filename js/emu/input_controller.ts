import { Controller, Response } from '../corgi/controller';
import { EmptyDeps } from '../corgi/deps';
import { CorgiEvent, DOM_KEYBOARD } from '../corgi/events';

import { ACTION, CHANGED, FOCUSED, PRESSED, UNFOCUSED } from './events';

interface Args {
  value: string|undefined;
}

export interface State {
  forcedValue: string | undefined;
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

  inputChanged(): void {
    this.maybeTriggerChanged();
  }

  keyUp(e: CorgiEvent<typeof DOM_KEYBOARD>): void {
    // Auto-complete fires keyup but it's not a KeyboardEvent and has no `key` property. Eject early
    // since our typing is wrong
    if (!e.detail.key) {
      this.maybeTriggerChanged();
      return;
    }

    // Handle special keys
    if (e.detail.key === 'Enter') {
      this.trigger(ACTION, {});
    } else if (e.detail.key.startsWith('Arrow') || e.detail.key === 'Escape') {
      this.trigger(PRESSED, {key: e.detail.key});
    }

    // No need to call maybeTriggerChanged because the inputChanged handler will already receive it
  }

  private maybeTriggerChanged(): void {
    const oldValue = this.lastValue;
    this.lastValue = this.value;
    if (oldValue !== this.lastValue) {
      if (this.state.managed) {
        // We could await this but it doesn't really help us, it just delays the trigger and means
        // our parents have the wrong value for longer
        this.updateState({
          forcedValue: undefined,
          managed: false,
        });
      }
      this.trigger(CHANGED, {value: this.value});
    }
  }
}
