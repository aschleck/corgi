import { waitMs, waitSettled, waitTicks } from '../common/promises';
import * as corgi from '../corgi';
import { Binder } from '../corgi/binder';
import { Controller, Response } from '../corgi/controller';
import { EmptyDeps } from '../corgi/deps';
import { declareEvent } from '../corgi/events';
import { Model, ModelResponse } from '../corgi/model';

afterEach(() => {
  document.body.innerHTML = '';
});

test('ignores non-js, non-unbound', () => {
  const div = document.createElement('div');
  document.body.append(div);
  new Binder().createdElement(div, {});
  expect(div.getAttribute('jscontroller')).toBeNull();
});

test('lazily sets up controller', async () => {
  const div = document.createElement('div');
  document.body.append(div);
  new Binder().createdElement(div, {
    js: corgi.bind({
      controller: NoisyController,
      state: [{}, (newState: {}) => {}],
    }),
  });

  await waitTicks(1);
  expect(div.getAttribute('jscontroller')).toBe('');
});

test('handles events', async () => {
  const div = document.createElement('div');
  document.body.append(div);
  const state = {
    created: false,
    clicked: false,
  };
  new Binder().createdElement(div, {
    js: corgi.bind({
      controller: NoisyController,
      args: {
        initCallback: () => {state.created = true;},
        clickCallback: () => {state.clicked = true;},
      },
      events: {'click': 'clicked'},
      state: [{}, (newState: {}) => {}],
    }),
  });

  await waitSettled();
  expect(state.created).toBe(false);
  expect(state.clicked).toBe(false);

  div.click();
  await waitSettled();
  expect(state.created).toBe(true);
  expect(state.clicked).toBe(true);
});

test('sets up controller ref', async () => {
  const div = document.createElement('div');
  document.body.append(div);
  new Binder().createdElement(div, {
    js: corgi.bind({
      controller: NoisyController,
      ref: 'cow',
      state: [{}, (newState: {}) => {}],
    }),
  });

  await waitTicks(1);
  expect(div.getAttribute('jsref')).toBe('cow');
});

test('cleans up controller and ref', async () => {
  const div = document.createElement('div');
  document.body.append(div);
  const binder = new Binder();

  const oldProps = {
    js: corgi.bind({
      controller: NoisyController,
      ref: 'cow',
      state: [{}, (newState: {}) => {}],
    }),
  };
  binder.createdElement(div, oldProps);

  await waitTicks(1);
  expect(div.getAttribute('jscontroller')).toBe('');
  expect(div.getAttribute('jsref')).toBe('cow');

  binder.patchedElement(div, oldProps, {});
  await waitTicks(1);
  expect(div.getAttribute('jscontroller')).toBeNull();
  expect(div.getAttribute('jsref')).toBeNull();
});

test('wakes up controller', async () => {
  const div = document.createElement('div');
  document.body.append(div);

  const state = {created: false};
  new Binder().createdElement(div, {
    js: corgi.bind({
      controller: NoisyController,
      args: {initCallback: () => {state.created = true;}},
      events: {render: 'wakeup'},
      state: [{}, (newState: {}) => {}],
    }),
  });

  await waitTicks(2);
  expect(state.created).toBe(true);
});

test('different args reuse controller', async () => {
  const div = document.createElement('div');
  document.body.append(div);
  const binder = new Binder();

  const originalProps = {
    js: corgi.bind({
      controller: NoisyController,
      events: {render: 'wakeup'},
      state: [{}, (newState: {}) => {}],
    }),
  };
  binder.createdElement(div, originalProps);
  await waitSettled();

  const state = {
    created: false,
    updatedArgs: false,
  };
  const newProps = {
    js: corgi.bind({
      controller: NoisyController,
      args: {
        initCallback: () => {state.created = true;},
        updateArgsCallback: () => {state.updatedArgs = true;},
      },
      events: {render: 'wakeup'},
      state: [{}, (newState: {}) => {}],
    }),
  };
  binder.patchedElement(div, originalProps, newProps);
  await waitSettled();

  expect(state.created).toBe(false);
  expect(state.updatedArgs).toBe(true);
});

// A controller's own updateState re-renders its element with a fresh but equal args object. That is
// not new args, and a controller that loads in updateArgs would otherwise load on every update.
test('equal args skip updateArgs', async () => {
  const div = document.createElement('div');
  document.body.append(div);
  const binder = new Binder();

  let updates = 0;
  const updateArgsCallback = () => {updates += 1;};
  const propsOf = () => ({
    js: corgi.bind({
      controller: NoisyController,
      args: {updateArgsCallback},
      events: {render: 'wakeup'},
      state: [{}, (newState: {}) => {}],
    }),
  });
  const originalProps = propsOf();
  binder.createdElement(div, originalProps);
  await waitSettled();

  binder.patchedElement(div, originalProps, propsOf());
  await waitSettled();

  expect(updates).toBe(0);
});

test('different keys recreate controller', async () => {
  const div = document.createElement('div');
  document.body.append(div);
  const binder = new Binder();

  const originalProps = {
    js: corgi.bind({
      controller: NoisyController,
      key: 'cat',
      events: {render: 'wakeup'},
      state: [{}, (newState: {}) => {}],
    }),
  };
  binder.createdElement(div, originalProps);
  await waitSettled();

  const state = {
    created: false,
    updatedArgs: false,
  };
  const newProps = {
    js: corgi.bind({
      controller: NoisyController,
      key: 'dog',
      args: {
        initCallback: () => {state.created = true;},
        updateArgsCallback: () => {state.updatedArgs = true;},
      },
      events: {render: 'wakeup'},
      state: [{}, (newState: {}) => {}],
    }),
  };
  binder.patchedElement(div, originalProps, newProps);
  await waitSettled();

  expect(state.created).toBe(true);
  expect(state.updatedArgs).toBe(false);
});

test('unbound events find controller', async () => {
  const div = document.createElement('div');
  document.body.append(div);
  const a = document.createElement('a');
  div.append(a);
  const binder = new Binder();

  const state = {clicked: false};
  binder.createdElement(div, {
    js: corgi.bind({
      controller: NoisyController,
      args: {clickCallback: () => {state.clicked = true;}},
      state: [{}, (newState: {}) => {}],
    }),
  });
  binder.createdElement(a, {
    unboundEvents: {click: 'clicked'},
  });
  await waitSettled();

  a.click();
  await waitSettled();

  expect(state.clicked).toBe(true);
});

test('unbound events find new controller', async () => {
  const div = document.createElement('div');
  document.body.append(div);
  const a = document.createElement('a');
  div.append(a);
  const binder = new Binder();

  const oldProps = {
    js: corgi.bind({
      controller: NoisyController,
      key: 'cat',
      state: [{}, (newState: {}) => {}],
    }),
  };
  binder.createdElement(div, oldProps);
  binder.createdElement(a, {
    unboundEvents: {click: 'clicked'},
  });
  await waitSettled();

  a.click();
  await waitSettled();

  const state = {
    created: false,
    clicked: false,
  };
  const newProps = {
    js: corgi.bind({
      controller: NoisyController,
      key: 'dog',
      args: {
        initCallback: () => {state.created = true;},
        clickCallback: () => {state.clicked = true;},
      },
      state: [{}, (newState: {}) => {}],
    }),
  };
  binder.patchedElement(div, oldProps, newProps);
  await waitSettled();

  a.click();
  await waitSettled();

  expect(state.created).toBe(true);
  expect(state.clicked).toBe(true);
});

test('unbound events find new controller', async () => {
  const div = document.createElement('div');
  document.body.append(div);
  const a = document.createElement('a');
  div.append(a);
  const binder = new Binder();

  const state = {clicked: false};
  binder.createdElement(div, {
    js: corgi.bind({
      controller: NoisyController,
      args: {clickCallback: () => {state.clicked = true;}},
      state: [{}, (newState: {}) => {}],
    }),
  });
  const oldProps = {
    unboundEvents: {click: 'clicked'},
  };
  binder.createdElement(a, oldProps);
  await waitSettled();

  const newProps = {
    unboundEvents: {},
  };
  binder.patchedElement(a, oldProps, newProps);
  await waitSettled();

  a.click();
  await waitSettled();
  expect(state.clicked).toBe(false);
});

test('unbound events beside a controller find the parent controller', async () => {
  const div = document.createElement('div');
  document.body.append(div);
  const a = document.createElement('a');
  div.append(a);
  const binder = new Binder();

  const state = {innerClicked: false, outerClicked: false};
  binder.createdElement(div, {
    js: corgi.bind({
      controller: NoisyController,
      args: {clickCallback: () => {state.outerClicked = true;}},
      state: [{}, (newState: {}) => {}],
    }),
  });
  binder.createdElement(a, {
    js: corgi.bind({
      controller: NoisyController,
      args: {clickCallback: () => {state.innerClicked = true;}},
      state: [{}, (newState: {}) => {}],
    }),
    unboundEvents: {click: 'clicked'},
  });
  await waitSettled();

  a.click();
  await waitSettled();

  expect(state.outerClicked).toBe(true);
  expect(state.innerClicked).toBe(false);
});

// When the parent re-renders before a controller's debounced updateState
// fires, the controller's stored response.state[1] used to keep pointing at
// the original closure (which targets an orphaned vdom handle). The next
// state update would land nowhere and be discarded by the parent's next
// render.
test('patched controller routes updateState to the latest closure', async () => {
  const div = document.createElement('div');
  document.body.append(div);
  const binder = new Binder();

  const calls: string[] = [];
  const oldProps = {
    js: corgi.bind({
      controller: SelfUpdatingController,
      events: {click: 'clicked'},
      state: [{}, () => { calls.push('old'); }],
    }),
  };
  binder.createdElement(div, oldProps);
  await waitSettled();

  const newProps = {
    js: corgi.bind({
      controller: SelfUpdatingController,
      events: {click: 'clicked'},
      state: [{}, () => { calls.push('new'); }],
    }),
  };
  binder.patchedElement(div, oldProps, newProps);
  await waitSettled();

  div.click();
  await waitMs(10);

  expect(calls).toEqual(['new']);
});

test('controller injects the nearest model above it', async () => {
  const outer = document.createElement('div');
  const outerLeaf = document.createElement('div');
  const inner = document.createElement('div');
  const innerLeaf = document.createElement('div');
  outer.append(outerLeaf, inner);
  inner.append(innerLeaf);
  document.body.append(outer);
  const binder = new Binder();

  const seen = new Map<string, CounterModel>();
  binder.createdElement(outer, {js: corgi.bind({model: CounterModel})});
  binder.createdElement(inner, {js: corgi.bind({model: CounterModel})});
  binder.createdElement(outerLeaf, {
    js: corgi.bind({
      controller: CounterController,
      args: {onCreate: model => { seen.set('outer', model); }},
      events: {click: 'clicked'},
    }),
  });
  binder.createdElement(innerLeaf, {
    js: corgi.bind({
      controller: CounterController,
      args: {onCreate: model => { seen.set('inner', model); }},
      events: {click: 'clicked'},
    }),
  });
  await waitSettled();

  outerLeaf.click();
  innerLeaf.click();
  await waitSettled();

  // outerLeaf can only reach the outer model, so a different instance must be the inner one
  expect(seen.get('outer')).toBeDefined();
  expect(seen.get('inner')).toBeDefined();
  expect(seen.get('inner')).not.toBe(seen.get('outer'));
});

test('a child rendered before its model is bound still finds it', async () => {
  const outer = document.createElement('div');
  const leaf = document.createElement('div');
  outer.append(leaf);
  document.body.append(outer);
  const binder = new Binder();

  const seen: CounterModel[] = [];
  // The vdom reports children before their parents.
  binder.createdElement(leaf, {
    js: corgi.bind({
      controller: CounterController,
      args: {onCreate: model => { seen.push(model); }},
      events: {render: 'clicked'},
    }),
  });
  binder.createdElement(outer, {js: corgi.bind({model: CounterModel})});
  await waitSettled();

  // The only model is on outer
  expect(seen).toHaveLength(1);
});

test('controller injects a model on its own element', async () => {
  const div = document.createElement('div');
  document.body.append(div);

  const seen: CounterModel[] = [];
  new Binder().createdElement(div, {
    js: corgi.bind({
      controller: CounterController,
      args: {onCreate: model => { seen.push(model); }},
      events: {click: 'clicked'},
      model: CounterModel,
    }),
  });
  await waitSettled();

  div.click();
  await waitSettled();

  // The only model is on the controller's own element
  expect(seen).toHaveLength(1);
});

test('broadcast creates controllers that bind the event and skips the rest', async () => {
  const model = document.createElement('div');
  const trigger = document.createElement('div');
  const listening = document.createElement('div');
  const deaf = document.createElement('div');
  model.append(trigger, listening, deaf);
  document.body.append(model);
  const binder = new Binder();

  const counts = {listening: 0, deaf: 0, bumps: [] as number[]};
  binder.createdElement(model, {js: corgi.bind({model: CounterModel})});
  binder.createdElement(trigger, {
    js: corgi.bind({
      controller: CounterController,
      args: {onCreate: model => { model.bump(); }},
      events: {click: 'clicked'},
    }),
  });
  binder.createdElement(listening, {
    js: corgi.bind({
      controller: CounterController,
      args: {
        onBumped: count => { counts.bumps.push(count); },
        onCreate: () => { counts.listening += 1; },
      },
      events: {corgi: [[BUMPED, 'bumped']]},
    }),
  });
  binder.createdElement(deaf, {
    js: corgi.bind({
      controller: CounterController,
      args: {onCreate: () => { counts.deaf += 1; }},
    }),
  });
  await waitSettled();
  expect(counts.listening).toBe(0);

  trigger.click();
  await waitSettled();

  expect(counts.listening).toBe(1);
  expect(counts.bumps).toEqual([1]);
  expect(counts.deaf).toBe(0);
});

test('broadcast skips controllers under a nearer model of the same type', async () => {
  const outer = document.createElement('div');
  const trigger = document.createElement('div');
  const inner = document.createElement('div');
  const shadowed = document.createElement('div');
  outer.append(trigger, inner);
  inner.append(shadowed);
  document.body.append(outer);
  const binder = new Binder();

  const bumps: number[] = [];
  binder.createdElement(outer, {js: corgi.bind({model: CounterModel})});
  binder.createdElement(inner, {js: corgi.bind({model: CounterModel})});
  binder.createdElement(trigger, {
    js: corgi.bind({
      controller: CounterController,
      args: {onCreate: model => { model.bump(); }},
      events: {click: 'clicked'},
    }),
  });
  binder.createdElement(shadowed, {
    js: corgi.bind({
      controller: CounterController,
      args: {onBumped: count => { bumps.push(count); }},
      events: {corgi: [[BUMPED, 'bumped']]},
    }),
  });
  await waitSettled();

  trigger.click();
  await waitSettled();

  expect(bumps).toEqual([]);
});

test('model injects a model above it', async () => {
  const outer = document.createElement('div');
  const outerLeaf = document.createElement('div');
  const inner = document.createElement('div');
  const innerLeaf = document.createElement('div');
  outer.append(outerLeaf, inner);
  inner.append(innerLeaf);
  document.body.append(outer);
  const binder = new Binder();

  const seen = new Map<string, CounterModel>();
  binder.createdElement(outer, {js: corgi.bind({model: CounterModel})});
  binder.createdElement(inner, {js: corgi.bind({model: DoublingModel})});
  binder.createdElement(outerLeaf, {
    js: corgi.bind({
      controller: CounterController,
      args: {onCreate: model => { seen.set('outer', model); }},
      events: {click: 'clicked'},
    }),
  });
  binder.createdElement(innerLeaf, {
    js: corgi.bind({
      controller: DoublingController,
      args: {onCreate: model => { seen.set('doubling', model.counter); }},
      events: {click: 'clicked'},
    }),
  });
  await waitSettled();

  outerLeaf.click();
  innerLeaf.click();
  await waitSettled();

  expect(seen.get('outer')).toBeDefined();
  expect(seen.get('doubling')).toBe(seen.get('outer'));
});

test('removing a model element disposes the model', async () => {
  const div = document.createElement('div');
  const leaf = document.createElement('div');
  div.append(leaf);
  document.body.append(div);
  const binder = new Binder();

  const seen: CounterModel[] = [];
  binder.createdElement(div, {js: corgi.bind({model: CounterModel})});
  binder.createdElement(leaf, {
    js: corgi.bind({
      controller: CounterController,
      args: {onCreate: model => { seen.push(model); }},
      events: {click: 'clicked'},
    }),
  });
  await waitSettled();
  leaf.click();
  await waitSettled();

  binder.removedNode(div);
  await waitSettled();

  expect(seen[0].isDisposed).toBe(true);
});

test('removing a model element disposes controllers before the model', async () => {
  const div = document.createElement('div');
  const leaf = document.createElement('div');
  div.append(leaf);
  document.body.append(div);
  const binder = new Binder();

  const modelDisposedFirst: boolean[] = [];
  binder.createdElement(div, {js: corgi.bind({model: CounterModel})});
  binder.createdElement(leaf, {
    js: corgi.bind({
      controller: CounterController,
      args: {onDispose: model => { modelDisposedFirst.push(model.isDisposed); }},
      events: {click: 'clicked'},
    }),
  });
  await waitSettled();
  leaf.click();
  await waitSettled();

  binder.removedNode(div);
  await waitSettled();

  expect(modelDisposedFirst).toEqual([false]);
});

interface NoisyArgs {
  initCallback?: () => void;
  clickCallback?: () => void;
  updateArgsCallback?: () => void;
}

class NoisyController extends Controller<NoisyArgs, EmptyDeps, HTMLElement, {}> {

  private args: NoisyArgs;

  constructor(response: Response<NoisyController>) {
    super(response);
    const args = response.args;
    this.args = args;
    if (args.initCallback) {
      args.initCallback();
    }
  }

  clicked(): void {
    if (this.args.clickCallback) {
      this.args.clickCallback();
    }
  }

  updateArgs(newArgs: NoisyArgs) {
    this.args = newArgs;
    if (newArgs.updateArgsCallback) {
      newArgs.updateArgsCallback();
    }
  }
}

class SelfUpdatingController extends Controller<{}, EmptyDeps, HTMLElement, {}> {
  clicked(): void {
    this.updateState({});
  }
}


const BUMPED = declareEvent<{count: number}>('bumped');

class CounterModel extends Model<EmptyDeps> {

  private count: number;

  constructor(response: ModelResponse<EmptyDeps>) {
    super(response);
    this.count = 0;
  }

  bump(): void {
    this.count += 1;
    this.broadcast(BUMPED, {count: this.count});
  }
}

type CounterDeps = () => {
  models: {
    counter: typeof CounterModel;
  };
};

class DoublingModel extends Model<CounterDeps> {

  readonly counter: CounterModel;

  constructor(response: ModelResponse<CounterDeps>) {
    super(response);
    this.counter = response.deps.models.counter;
  }

  static deps() {
    return {
      models: {
        counter: CounterModel,
      },
    };
  }
}

interface CounterArgs {
  onBumped?: (count: number) => void;
  onCreate?: (model: CounterModel) => void;
  onDispose?: (model: CounterModel) => void;
}

class CounterController extends Controller<CounterArgs, CounterDeps, HTMLElement, undefined> {

  static deps() {
    return {
      models: {
        counter: CounterModel,
      },
    };
  }

  private readonly args: CounterArgs;

  constructor(response: Response<CounterController>) {
    super(response);
    this.args = response.args;
    const counter = response.deps.models.counter;
    this.args.onCreate?.(counter);
    this.registerDisposer(() => {
      this.args.onDispose?.(counter);
    });
  }

  bumped(e: CustomEvent<{count: number}>): void {
    this.args.onBumped?.(e.detail.count);
  }

  clicked(): void {}
}

type DoublingDeps = () => {
  models: {
    doubling: typeof DoublingModel;
  };
};

class DoublingController extends
    Controller<{onCreate: (model: DoublingModel) => void}, DoublingDeps, HTMLElement, undefined> {

  static deps() {
    return {
      models: {
        doubling: DoublingModel,
      },
    };
  }

  constructor(response: Response<DoublingController>) {
    super(response);
    response.args.onCreate(response.deps.models.doubling);
  }

  clicked(): void {}
}
