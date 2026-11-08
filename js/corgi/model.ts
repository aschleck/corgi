import { Disposable } from '../common/disposable';

import { EventSpec } from './events';
import { ServiceDeps } from './service';
import { DepsConstructed, DepsConstructorsFor } from './types';

export type ModelDeps = ServiceDeps & {
  models: {[key: string]: Model<any>};
};

export type ModelDepsMethod = () => DepsConstructorsFor<ModelDeps>;

export interface ModelCtor<M extends Model<any>> {
  deps?(): ReturnType<M['_D']>;
  new (response: ModelResponse<M['_D']>): M;
}

export interface ModelResponse<D extends ModelDepsMethod> {
  deps: DepsConstructed<ReturnType<D>>;
  broadcast: <S>(spec: EventSpec<S>, detail: S) => void;
}

/**
 * Holds state shared by the controllers bound inside the element that binds it. Controllers
 * inject the nearest one above them through deps().models and hear its broadcasts through the
 * corgi events they bind.
 */
export class Model<D extends ModelDepsMethod> extends Disposable {

  readonly _D!: D;

  private readonly broadcaster: <S>(spec: EventSpec<S>, detail: S) => void;

  constructor(response: ModelResponse<D>) {
    super();
    this.broadcaster = response.broadcast;
  }

  // Calls every controller under this model with a binding to the event type. Controllers that
  // haven't yet been initialized will be.
  protected broadcast<S>(spec: EventSpec<S>, detail: S): void {
    this.broadcaster(spec, detail);
  }
}
