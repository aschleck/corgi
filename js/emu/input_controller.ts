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

  async keyPressed(e: CorgiEvent<typeof DOM_KEYBOARD>): Promise<void> {
    if (e.detail.key === 'Enter') {
      this.trigger(ACTION, {});
    } else if (e.detail.key.startsWith('Arrow')) {
      this.trigger(PRESSED, {key: e.detail.key});
    } else if (e.detail.key.length === 1 && this.value.indexOf(e.detail.key) < 0) {
      // There's a crazy bug that happens when the user types just as the element renders. We get a
      // keyUp event for a key but it does *not* show up on the element. I don't know where it goes
      // but we need it. We filter for key.length === 1 to avoid Backspace, Tab, Arrow, etc.
      //
      // It's not clear to me that this works for IME keyboards but I don't have one.
      //
      // Note that appending it is a little sketchy (what if the users focus is at the start of the
      // value) but given the situation is a brand new element with instant typing it is hard to
      // imagine how the caret could be anywhere but at the end.
      this.lastValue = this.lastValue + e.detail.key;
      this.updateState({
        forcedValue: this.lastValue,
        managed: true,
      });
    } else {
      this.lastValue = this.value;
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
