import { Controller, Response } from '../corgi/controller';
import { EmptyDeps } from '../corgi/deps';
import { CorgiEvent } from '../corgi/events';

import { ACTION } from './events';

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

  keyPressed(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      this.trigger(ACTION, {});
    }
  }
}
