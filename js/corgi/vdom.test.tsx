import { waitMs, waitSettled } from '../common/promises';
import * as corgi from '../corgi';
import { Controller, Response } from '../corgi/controller';
import { EmptyDeps } from '../corgi/deps';

afterEach(() => {
  document.body.innerHTML = '';
});

test('adds element to dom', () => {
  corgi.appendElement(document.body, <span>Hello</span>);
  expect(document.body.innerHTML).toBe('<span>Hello</span>');
});

test('adds function to dom', () => {
  corgi.appendElement(document.body, <Tree />);
  expect(document.body.innerHTML).toBe('<div><span>first</span><div>second</div></div>');
});

test('adds primitive function to dom', () => {
  corgi.appendElement(document.body, <SimpleString />);
  expect(document.body.innerHTML).toBe('hello');
});

test('adds number to dom', () => {
  corgi.appendElement(document.body, 2.718);
  expect(document.body.innerHTML).toBe('2.718');
});

test('adds text to dom', () => {
  corgi.appendElement(document.body, 'hello world');
  expect(document.body.innerHTML).toBe('hello world');
});

test('adds data to dom', () => {
  corgi.appendElement(document.body, <div data={{hello: 1, goAwayNow: 2}}></div>);
  expect(document.body.innerHTML).toBe('<div data-hello=\"1\" data-go-away-now=\"2\"></div>');
});

test('adds wrapper to dom', () => {
  corgi.appendElement(document.body, <WrapChildren><div>hi!</div><span>bye!</span></WrapChildren>);
  expect(document.body.innerHTML).toBe('<div><div>hi!</div><span>bye!</span></div>');
});

test('handles checked boolean attributes', () => {
  corgi.appendElement(document.body, <input type="checkbox" checked={true} />);
  expect(document.body.innerHTML).toBe('<input type=\"checkbox\">');
  expect(document.body.querySelector('input')?.checked).toBe(true);
})

test('skips false boolean attributes', () => {
  corgi.appendElement(document.body, <input type="checkbox" checked={false} />);
  expect(document.body.innerHTML).toBe('<input type=\"checkbox\">');
})

test('adds class attributes', () => {
  corgi.appendElement(document.body, <span className="moo">Hello</span>);
  expect(document.body.innerHTML).toBe('<span class="moo">Hello</span>');
});

test('adds underscore attributes', () => {
  corgi.appendElement(document.body, <text textAnchor="middle" />);
  expect(document.body.innerHTML).toBe('<text text-anchor=\"middle\"></text>');
});

test('sets value on inputs', () => {
  corgi.appendElement(document.body, <input type="text" value="moo" />);
  expect(document.body.innerHTML).toBe('<input type="text">');
  expect((document.body.children[0] as HTMLInputElement).value).toBe('moo');
});

test('sets draggable correctly', () => {
  corgi.appendElement(document.body, <div draggable={true} />);
  expect(document.body.innerHTML).toBe('<div draggable="true"></div>');
  expect((document.body.children[0] as HTMLElement).draggable).toBe(true);
});

test('merges fragments', () => {
  corgi.appendElement(
      document.body,
      <div>
        <>
          <span>Hello</span>
        </>
        <>
          <span>Goodbye</span>
        </>
      </div>);
  expect(document.body.innerHTML).toBe('<div><span>Hello</span><span>Goodbye</span></div>');
});

test('skips fragment', () => {
  corgi.appendElement(document.body, <div><><span>Hello</span></></div>);
  expect(document.body.innerHTML).toBe('<div><span>Hello</span></div>');
});

test('patches dom', async () => {
  corgi.appendElement(document.body, <Flipper />);
  await waitSettled();
  expect(document.body.innerHTML).toBe('<div>Pushed: true</div>');
});

test('patch removes boolean attribute', async () => {
  corgi.appendElement(document.body, <BooleanRemover />);
  await waitSettled();
  expect(document.body.innerHTML).toBe('<input type="checkbox">');
});

test('patch modifies fragment after removed child', async () => {
  corgi.appendElement(document.body, <FragmentModifier1 />);
  await waitSettled();
  expect(document.body.innerHTML).toBe('<span>Bye</span>');
});

test('patch handles obsolete state changes', async () => {
  corgi.appendElement(document.body, <FragmentModifier2 />);
  await waitSettled();
  expect(document.body.innerHTML).toBe('<span>Good</span>bye<span>Bye</span>');
});

test('patch adds string attribute', async () => {
  corgi.appendElement(document.body, <StringAdder />);
  await waitSettled();
  expect(document.body.innerHTML).toBe('<span>Good</span>bye');
});

test('patch adds string attribute opposite', async () => {
  corgi.appendElement(document.body, <StringAdder2 />);
  await waitSettled();
  expect(document.body.innerHTML).toBe('Good<span>bye</span><span>friend</span>');
});

test('patch removes string attribute', async () => {
  corgi.appendElement(document.body, <StringRemover />);
  await waitSettled();
  expect(document.body.innerHTML).toBe('<span></span>');
});

test('patch removes class attribute', async () => {
  corgi.appendElement(document.body, <ClassNameRemover />);
  await waitSettled();
  expect(document.body.innerHTML).toBe('<div></div>');
});

test('patches evil counter', async () => {
  corgi.appendElement(document.body, <EvilCounter />);
  await waitSettled();
  expect(document.body.innerHTML).toBe('FirstSecondThird');
});

test('patches evil reducer', async () => {
  corgi.appendElement(document.body, <EvilReducer />);
  await waitSettled();
  expect(document.body.innerHTML).toBe('what');
});

test('patches fragment dom in', async () => {
  corgi.appendElement(document.body, <FragmentFlipper initial={false} />);
  await waitSettled();
  expect(document.body.innerHTML)
      .toBe('<div><span>First</span><div>second</div><span>third</span></div>');
});

test('patches fragment dom out', async () => {
  corgi.appendElement(document.body, <TreeFlipper />);
  await waitSettled();
  expect(document.body.innerHTML)
      .toBe('<div><span>Good</span><div><span>job</span></div><span>you pressed it</span></div>');
});

test('hydrates dom', async () => {
  document.body.innerHTML = '<div>Pushed: false</div>';
  corgi.hydrateElement(document.body, <Flipper />);
  await waitSettled();
  expect(document.body.innerHTML).toBe('<div>Pushed: true</div>');
});

test('hydrates evil', async () => {
  corgi.hydrateElement(document.body, <EvilCounter />);
  await waitSettled();
  expect(document.body.innerHTML).toBe('FirstSecondThird');
});

test('hydrates order correctly', async () => {
  document.body.innerHTML = '<div><span>Goodbye</span></div>';
  corgi.hydrateElement(document.body, <FlipperHidden />);
  await waitSettled();
  expect(document.body.innerHTML).toBe('<div>Hi<span>Goodbye</span></div>');
});

// Function-element state used to leak across siblings whenever one of them
// rendered nested function elements: the inner createVirtualElement consumed
// entries from the parent's lastCreationTrace that belonged to the next
// sibling, so on every re-render of the grandparent, anything past the first
// nesting parent fell back to undefined and reset.
test('nested function-element state survives parent re-render', async () => {
  corgi.appendElement(document.body, <Grandparent />);
  await waitSettled();

  // Leaf is two levels deep (Grandparent -> Middle -> Leaf).
  (document.body.querySelector('[data-leaf]') as HTMLButtonElement).click();
  await waitMs(10);
  expect(document.body.querySelector('[data-leaf]')!.getAttribute('data-leaf')).toBe('open');

  // Sibling is rendered AFTER Middle, so its state lookup is the one that gets
  // corrupted by Leaf consuming the wrong slot.
  (document.body.querySelector('[data-sibling]') as HTMLButtonElement).click();
  await waitMs(10);
  expect(document.body.querySelector('[data-sibling]')!.getAttribute('data-sibling')).toBe('on');

  (document.body.querySelector('[data-bump]') as HTMLButtonElement).click();
  await waitMs(10);
  expect(document.body.querySelector('[data-leaf]')!.getAttribute('data-leaf')).toBe('open');
  expect(document.body.querySelector('[data-sibling]')!.getAttribute('data-sibling')).toBe('on');
});

function SimpleString() {
  return 'hello';
}

// Grandparent has a bump button and two siblings: a wrapper that nests Leaf,
// and Sibling. `tick` is passed as a prop so each parent render produces a
// different factorySource (cache miss in patchChildren), forcing the lookup
// path that previously corrupted sibling state.
function Grandparent(
    {}: {},
    state: {tick: number}|undefined,
    updateState: (s: {tick: number}) => void) {
  if (!state) state = {tick: 0};
  const tick = state.tick;
  return (
    <div>
      <button
          data-bump
          js={corgi.bind({
            controller: BumpController,
            args: {bump: () => updateState({tick: tick + 1})},
            events: {click: 'clicked'},
            state: [{}, () => {}],
          })}>
        bump
      </button>
      <Middle tick={tick} />
      <Sibling tick={tick} />
    </div>
  );
}

function Middle({tick}: {tick: number}) {
  return <div><Leaf tick={tick} /></div>;
}

function Leaf(
    {}: {tick: number},
    state: {open: boolean}|undefined,
    updateState: (s: {open: boolean}) => void) {
  if (!state) state = {open: false};
  return (
    <button
        data-leaf={state.open ? 'open' : 'closed'}
        js={corgi.bind({
          controller: ToggleController,
          events: {click: 'toggle'},
          state: [state, updateState],
        })}>
      leaf
    </button>
  );
}

function Sibling(
    {}: {tick: number},
    state: {on: boolean}|undefined,
    updateState: (s: {on: boolean}) => void) {
  if (!state) state = {on: false};
  return (
    <button
        data-sibling={state.on ? 'on' : 'off'}
        js={corgi.bind({
          controller: SiblingController,
          events: {click: 'toggle'},
          state: [state, updateState],
        })}>
      sibling
    </button>
  );
}

class ToggleController extends Controller<{}, EmptyDeps, HTMLElement, {open: boolean}> {
  toggle(): void { this.updateState({...this.state, open: !this.state.open}); }
}

class SiblingController extends Controller<{}, EmptyDeps, HTMLElement, {on: boolean}> {
  toggle(): void { this.updateState({...this.state, on: !this.state.on}); }
}

class BumpController extends Controller<{bump: () => void}, EmptyDeps, HTMLElement, {}> {
  private bumpFn: () => void;
  constructor(response: Response<BumpController>) {
    super(response);
    this.bumpFn = response.args.bump;
  }
  updateArgs(args: {bump: () => void}) {
    this.bumpFn = args.bump;
  }
  clicked(): void { this.bumpFn(); }
}

function WrapChildren({children}: {children?: corgi.VElementOrPrimitive[]}) {
  return <div>{children}</div>;
}

function Tree() {
  return (
    <div>
      <span>first</span>
      <div>second</div>
    </div>
  );
}

interface FlipperState {
  pushed: boolean;
}

function BooleanRemover(
    {}: {},
    state: FlipperState|undefined,
    updateState: (newState: FlipperState) => void) {
  if (!state) {
    state = {
      pushed: false,
    }
  }

  if (!state.pushed) {
    Promise.resolve().then(() => {
      updateState({pushed: true});
    });
  }

  return <input type="checkbox" checked={state.pushed ? undefined : true} />;
}

function FragmentModifier1(
    {}: {},
    state: FlipperState|undefined,
    updateState: (newState: FlipperState) => void) {
  if (!state) {
    state = {
      pushed: false,
    }
  }

  if (!state.pushed) {
    Promise.resolve().then(() => {
      return updateState({pushed: true});
    });
  }

  if (state.pushed) {
    return <>
      <></>
      <span>Bye</span>
    </>;
  } else {
    return <>
      <><div></div></>
    </>;
  }
}

function FragmentModifier2(
    {}: {},
    state: FlipperState|undefined,
    updateState: (newState: FlipperState) => void) {
  if (!state) {
    state = {
      pushed: false,
    }
  }

  if (!state.pushed) {
    Promise.resolve().then(() => {
      updateState({pushed: true});
    });
  }

  if (state.pushed) {
    return <>
      <>
        <StringAdder />
        <><span>Bye</span></>
      </>
    </>;
  } else {
    return <>
      <>
        <StringAdder />
      </>
    </>;
  }
}

function StringAdder(
    {}: {},
    state: FlipperState|undefined,
    updateState: (newState: FlipperState) => void) {
  if (!state) {
    state = {
      pushed: false,
    }
  }

  if (!state.pushed) {
    Promise.resolve().then(() => {
      updateState({pushed: true});
    });
  }

  if (state.pushed) {
    return <><span>Good</span>bye</>;
  } else {
    return <>Bye</>;
  }
}

function StringAdder2(
    {}: {},
    state: FlipperState|undefined,
    updateState: (newState: FlipperState) => void) {
  if (!state) {
    state = {
      pushed: false,
    }
  }

  if (!state.pushed) {
    Promise.resolve().then(() => {
      updateState({pushed: true});
    });
  }

  if (state.pushed) {
    return <>Good<span>bye</span><span>friend</span></>;
  } else {
    return <>Good</>;
  }
}

function StringRemover(
    {}: {},
    state: FlipperState|undefined,
    updateState: (newState: FlipperState) => void) {
  if (!state) {
    state = {
      pushed: false,
    }
  }

  if (!state.pushed) {
    Promise.resolve().then(() => {
      updateState({pushed: true});
    });
  }

  return <span style={state.pushed ? undefined : 'text-align: middle'}></span>;
}

function ClassNameRemover(
    {}: {},
    state: FlipperState|undefined,
    updateState: (newState: FlipperState) => void) {
  if (!state) {
    state = {
      pushed: false,
    }
  }

  if (!state.pushed) {
    Promise.resolve().then(() => {
      updateState({pushed: true});
    });
  }

  return <div className={state.pushed ? undefined : 'moo'}></div>;
}

function Flipper(
    {}: {},
    state: FlipperState|undefined,
    updateState: (newState: FlipperState) => void) {
  if (!state) {
    state = {
      pushed: false,
    }
  }

  if (!state.pushed) {
    Promise.resolve().then(() => {
      updateState({pushed: true});
    });
  }

  return <div>Pushed: {String(state.pushed)}</div>;
}

function FlipperHidden(
    {}: {},
    state: FlipperState|undefined,
    updateState: (newState: FlipperState) => void) {
  if (!state) {
    state = {
      pushed: false,
    }
  }

  if (!state.pushed) {
    Promise.resolve().then(() => {
      updateState({pushed: true});
    });
  }

  return <div>{state.pushed ? 'Hi' : ''}<span>Goodbye</span></div>;
}

function EvilCounter(
    {}: {},
    state: {count: number}|undefined,
    updateState: (newState: {count: number}) => void) {
  if (!state) {
    state = {
      count: 0,
    }
  }

  if (state.count === 0) {
    Promise.resolve().then(() => {
      updateState({count: 1});
    });
  } else if (state.count === 1) {
    Promise.resolve().then(() => {
      updateState({count: 2});
    });
  } else if (state.count === 2) {
    Promise.resolve().then(() => {
      updateState({count: 3});
    });
  }

  if (state.count === 0) {
    return (
      <>
        <></>
        <></>
        <></>
      </>
    );
  } else if (state.count === 1) {
    return (
      <>
        <></>
        <></>
        <>Third</>
      </>
    );
  } else if (state.count === 2) {
    return (
      <>
        <>First</>
        <></>
        <>Third</>
      </>
    );
  } else if (state.count === 3) {
    return (
      <>
        <>First</>
        <>Second</>
        <>Third</>
      </>
    );
  } else {
    return 'what';
  }
}

function EvilReducer(
    {}: {},
    state: {count: number}|undefined,
    updateState: (newState: {count: number}) => void) {
  if (!state) {
    state = {
      count: 0,
    }
  }

  if (state.count === 0) {
    Promise.resolve().then(() => {
      debugger;
      updateState({count: 1});
    });
  } else if (state.count === 1) {
    Promise.resolve().then(() => {
      updateState({count: 2});
    });
  }

  if (state.count === 0) {
    return (
      <>
        <>A cow</>
        <div>{'Something'}</div>
      </>
    );
  } else if (state.count === 1) {
    return (
      <>
        {'Nothing'}
      </>
    );
  } else {
    return 'what';
  }
}

function FragmentFlipper(
    {initial}: {initial: boolean},
    state: FlipperState|undefined,
    updateState: (newState: FlipperState) => void) {
  if (!state) {
    state = {
      pushed: initial,
    }
  }

  const activeState = state;

  if (state.pushed === initial) {
    Promise.resolve().then(() => {
      updateState({pushed: !activeState.pushed});
    });
  }

  if (state.pushed) {
    return (
      <div>
        <span>First</span>
        <div>second</div>
        <span>third</span>
      </div>
    );
  } else {
    return (
      <div>
        <span>First</span>
        <></>
        <div>third</div>
      </div>
    );
  }
}

function TreeFlipper(
    {}: {},
    state: FlipperState|undefined,
    updateState: (newState: FlipperState) => void) {
  if (!state) {
    state = {
      pushed: false,
    }
  }

  if (!state.pushed) {
    Promise.resolve().then(() => {
      updateState({pushed: true});
    });
  }

  if (state.pushed) {
    return (
      <div>
        <span>Good</span>
        <div><span>job</span></div>
        <span>you pressed it</span>
      </div>
    );
  } else {
    return (
      <div>
        <span>Please</span>
        <div><span>press</span></div>
        <div>the button</div>
      </div>
    );
  }
}
