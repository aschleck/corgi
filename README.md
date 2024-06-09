# corgi

This is a generally sketchy JavaScript library inspired by React and a proprietary framework that I
love. The basic idea is to separate views from controller logic, so you end up with standard TSX
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

Please note that this is a fairly yolo Bazel module. I do have multiple projects depending on it but
you should *not* expect this to Just Work™.

If you do want it to work, it's some combo of Bazel 7.1.1+ and

(in `.bazelrc`)

```
common --experimental_isolated_extension_usages
```

(in `aspect_rules_ts.patch`)

```
diff -Naur ts/private/ts_lib.bzl ts/private/ts_lib.bzl
--- ts/private/ts_lib.bzl
+++ ts/private/ts_lib.bzl
@@ -167,7 +167,7 @@ def _join(*elements):
 def _relative_to_package(path, ctx):
     # TODO: "external/" should only be needed to be removed once
     path = path.removeprefix("external/").removeprefix(ctx.bin_dir.path + "/")
-    path = path.removeprefix("external/").removeprefix(ctx.label.workspace_name + "/")
+    path = path.removeprefix("../").removeprefix("external/").removeprefix(ctx.label.workspace_name + "/")
     if ctx.label.package:
         path = path.removeprefix("external/").removeprefix(ctx.label.package + "/")
     return path
```

+

(in `MODULE.bzl`)

```
archive_override(
    module_name = "aspect_rules_ts",
    integrity = "sha256-x38N+njEB4k4BkkSI8EmTCiQdP7vv3BnIXQ6NVb6fOo=",
    patches = ["aspect_rules_ts.patch"],
    strip_prefix = "rules_ts-2.2.0",
    urls = "https://github.com/aspect-build/rules_ts/archive/refs/tags/v2.2.0.tar.gz",
)
```

