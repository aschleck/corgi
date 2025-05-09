# corgi

This is a generally sketchy JavaScript library inspired by React and Google's Wiz (my favorite
framework). The basic idea is to separate views from controller logic, so you end up with standard TSX
views like `overview_element.tsx` and corgi controllers like `overview_controller.ts.` Controllers
are lazily initialized and event driven, and can communicate with each other by firing events. When
a controller needs to update view state, it calls `updateState({background: 'red'})` and the view
is reinvoked and patched into the page. This framework also allows controllers to depend on
singleton classes, called services. Finally, when a controller's element is removed from the page,
it is disposed.

corgi supports server-side render and embedding initial data. Honestly, it's a pretty rad framework.

This library also contains
* Some useful utilities in //js/common
* A minimal, unskinned corgi-compatible UI library in //js/emu

What's missing
* Imagine an Input element inside of a parent element. If the Input element changing causes the
  parent to re-render everything, including the Input, Emu struggles to avoid clobbering user input
* The server-side data framework is messy. I might open source some code using
  https://github.com/bufbuild/protobuf-es that wraps it into a nicer package, but the whole thing
  deserves a refactor
* We should have a small JS bootstrap snippet that buffers events until the full library loads, so
  we never lose events during slow loads
* (Not planned) code splitting and just-in-time controller fetching

## Example snippet

`cookie_clicker_controller.ts`:

```ts
export interface State {
  count: number;
}

export class OverviewController extends Controller<{}, EmptyDeps, HTMLElement, State> {

  constructor(response: Response<OverviewController>) {
    super(response);
  }

  click(): void {
    this.updateState({
      count: this.state.count + 1,
    });
  }
```

`cookie_clicker_element.tsx`:

```ts
export function CookierClickerElement(
    props: {}, state: State|undefined, updateState: (newState: State) => void) {
  if (!state) {
    state = {
      count: 0,
    };
  }

  return <>
    <button
        js={corgi.bind({
          controller: CookieClickerController,
          args: undefined,
          events: {
            click: 'click',
          },
          state: [state, updateState],
        })}
    >
      {state.count} cookies
    </button>
  </>;
}
```

### More fancy snippet

`cookie_clicker_element.tsx`:

```ts
export function CookierClickerElement(
    props: {}, state: State|undefined, updateState: (newState: State) => void) {
  if (!state) {
    state = {
      count: 0,
    };
  }

  return <>
    <div
        js={corgi.bind({
          controller: CookieClickerController,
          args: undefined,
          state: [state, updateState],
        })}
    >
      {state.count} cookies
      <a unboundEvents={{click: 'click'}}>Click</a>
    </div>
  </>;
}
```

## Caution

Please note that this is a fairly yolo Bazel module. I do have multiple projects depending on it but don't aim
for commit-to-commit stability. You can always just pin to a commit, though.

I think you need to add the following in `.bazelrc`

```
common --experimental_isolated_extension_usages
```
