import { Controller, Response } from '../corgi/controller';
import { EmptyDeps } from '../corgi/deps';
import { CorgiEvent, DOM_KEYBOARD } from '../corgi/events';

import { ACTION, FOCUSED, UNFOCUSED } from './events';

interface Args {
}

export interface State {
}

export class ButtonController extends Controller<Args, EmptyDeps, HTMLElement, State> {

  constructor(response: Response<ButtonController>) {
    super(response);
  }

  clicked(): void {
    this.trigger(ACTION, {});
  }

  focused(): void {
    this.trigger(FOCUSED, {});
  }

  unfocused(): void {
    this.trigger(UNFOCUSED, {});
  }

  keyPressed(e: CorgiEvent<typeof DOM_KEYBOARD>): void {
    if (e.detail.key === 'Enter' || e.detail.key === ' ') {
      this.trigger(ACTION, {});
    }
  }
}
