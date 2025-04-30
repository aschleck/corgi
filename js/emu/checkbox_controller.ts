import { Controller, Response } from '../corgi/controller';
import { EmptyDeps } from '../corgi/deps';
import { CorgiEvent, DOM_KEYBOARD } from '../corgi/events';

import { ACTION } from './events';

interface Args {
}

export interface State {
  checked: boolean;
}

export class CheckboxController extends Controller<Args, EmptyDeps, HTMLInputElement, State> {

  constructor(response: Response<CheckboxController>) {
    super(response);
  }

  get checked(): boolean {
    return this.root.checked;
  }

  clicked(): void {
    this.updateState({
      ...this.state,
      checked: !this.state.checked,
    });
    this.trigger(ACTION, {});
  }

  keyPressed(e: CorgiEvent<typeof DOM_KEYBOARD>): void {
    if (e.detail.key === 'Enter' || e.detail.key === ' ') {
      this.updateState({
        ...this.state,
        checked: !this.state.checked,
      });
      this.trigger(ACTION, {});
    }
  }
}
