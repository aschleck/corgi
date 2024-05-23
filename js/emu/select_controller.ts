import { Controller, Response } from '../corgi/controller';
import { EmptyDeps } from '../corgi/deps';
import { CorgiEvent } from '../corgi/events';

import { CHANGED } from './events';

interface Args {}

export interface State {
}

export class SelectController extends Controller<Args, EmptyDeps, HTMLSelectElement, State> {

  constructor(response: Response<SelectController>) {
    super(response);
  }

  get value(): string {
    return this.root.value;
  }

  changed(e: CorgiEvent<unknown>): void {
    this.trigger(CHANGED, {value: this.value});
  }
}

