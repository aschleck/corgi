import { checkArgument, checkExists, checkExhaustive } from '../common/asserts';
import { deepEqual } from '../common/comparisons';
import { Disposable } from '../common/disposable';
import { Future, asFuture, resolvedFuture } from '../common/futures';

import { Controller, ControllerCtor, ControllerDeps, ControllerDepsMethod, Response as ControllerResponse } from './controller';
import { elementFinder, parentFinder, QueryOne, SupportedElement } from './dom';
import { Properties } from './elements';
import { EventSpec, qualifiedName } from './events';
import { Model, ModelCtor, ModelDeps } from './model';
import { isAnchorContextClick } from './mouse';
import { Service, ServiceDeps } from './service';
import { DepsConstructorsFor } from './types';
import { Listener } from './vdom';

type IsPrefix<P extends unknown[], T> = P extends [...P, ...unknown[]] ? P : never;
type HasParameters<M, P extends unknown[], R> =
      M extends (...args: any) => any ? IsPrefix<Parameters<M>, P> extends never ? never : R : never;
type IsMethodWithParameters<T, K extends keyof T, P extends unknown[]> = HasParameters<T[K], P, K>;
type AMethodOnWithParameters<T, P extends unknown[]> = keyof {[K in keyof T as IsMethodWithParameters<T, K, P>]: 'valid'};

interface PropertyKeyToHandlerMap<C> {
  blur: AMethodOnWithParameters<C, [CustomEvent<FocusEvent>]>;
  change: AMethodOnWithParameters<C, [CustomEvent<Event>]>;
  click: AMethodOnWithParameters<C, [CustomEvent<MouseEvent>]>;
  contextmenu: AMethodOnWithParameters<C, [CustomEvent<PointerEvent>]>;
  corgi: Array<[
    EventSpec<unknown>,
    AMethodOnWithParameters<C, [CustomEvent<unknown>]>,
  ]>;
  dblclick: AMethodOnWithParameters<C, [CustomEvent<MouseEvent>]>;
  drag: AMethodOnWithParameters<C, [CustomEvent<DragEvent>]>;
  dragend: AMethodOnWithParameters<C, [CustomEvent<DragEvent>]>;
  dragenter: AMethodOnWithParameters<C, [CustomEvent<DragEvent>]>;
  dragleave: AMethodOnWithParameters<C, [CustomEvent<DragEvent>]>;
  dragover: AMethodOnWithParameters<C, [CustomEvent<DragEvent>]>;
  dragstart: AMethodOnWithParameters<C, [CustomEvent<DragEvent>]>;
  drop: AMethodOnWithParameters<C, [CustomEvent<DragEvent>]>;
  focus: AMethodOnWithParameters<C, [CustomEvent<FocusEvent>]>;
  focusin: AMethodOnWithParameters<C, [CustomEvent<FocusEvent>]>;
  focusout: AMethodOnWithParameters<C, [CustomEvent<FocusEvent>]>;
  keydown: AMethodOnWithParameters<C, [CustomEvent<KeyboardEvent>]>;
  keypress: AMethodOnWithParameters<C, [CustomEvent<KeyboardEvent>]>;
  keyup: AMethodOnWithParameters<C, [CustomEvent<KeyboardEvent>]>;
  // This is wrong, it could also just be Event, but also I don't care
  input: AMethodOnWithParameters<C, [CustomEvent<InputEvent>]>;
  mousedown: AMethodOnWithParameters<C, [CustomEvent<MouseEvent>]>;
  mouseover: AMethodOnWithParameters<C, [CustomEvent<MouseEvent>]>;
  mouseout: AMethodOnWithParameters<C, [CustomEvent<MouseEvent>]>;
  mouseup: AMethodOnWithParameters<C, [CustomEvent<MouseEvent>]>;
  paste: AMethodOnWithParameters<C, [CustomEvent<ClipboardEvent>]>;
  pointercancel: AMethodOnWithParameters<C, [CustomEvent<PointerEvent>]>;
  pointerdown: AMethodOnWithParameters<C, [CustomEvent<PointerEvent>]>;
  pointerenter: AMethodOnWithParameters<C, [CustomEvent<PointerEvent>]>;
  pointerleave: AMethodOnWithParameters<C, [CustomEvent<PointerEvent>]>;
  pointermove: AMethodOnWithParameters<C, [CustomEvent<PointerEvent>]>;
  pointerout: AMethodOnWithParameters<C, [CustomEvent<PointerEvent>]>;
  pointerover: AMethodOnWithParameters<C, [CustomEvent<PointerEvent>]>;
  pointerup: AMethodOnWithParameters<C, [CustomEvent<PointerEvent>]>;
  render: AMethodOnWithParameters<C, []>;
}

type StateTuple<S> = [S, (newState: S) => void];

interface BoundController<C extends Controller<any, any, any, any>> {
  args: C['_A'];
  // Unset when the element only binds a model
  controller: ControllerCtor<C>|undefined;
  disposer: Disposable;
  events: Partial<PropertyKeyToHandlerMap<C>>;
  instance?: Future<C>;
  key?: string; // controllers will only be reused if their keys match
  model: ModelCtor<any>|undefined;
  modelInstance?: Future<Model<any>>;
  ref?: string;
  state: StateTuple<C['_S']>;
}

export interface AnyBoundController extends BoundController<any> {}

export type UnboundEvents =
    Partial<
      Omit<{
        [k in keyof PropertyKeyToHandlerMap<AnyBoundController>]: string
      }, 'corgi'> & {
        corgi: Array<[EventSpec<unknown>, string]>;
      }
    >;
;

/**
 * Binds a controller, a model, or both to an element. A controller on the same element as a model
 * can inject it.
 */
export function bind<C extends Controller<any, any, any, any>>(spec: {
  controller: ControllerCtor<C>;
  events?: Partial<PropertyKeyToHandlerMap<C>>;
  key?: string;
  model?: ModelCtor<any>;
  ref?: string;
}
& ({} extends C['_A'] ? {args?: C['_A']} : {args: C['_A']})
& (undefined extends C['_S'] ? {state?: never} : {state: StateTuple<C['_S']>})
): BoundController<C>;
export function bind(spec: {model: ModelCtor<any>}): AnyBoundController;
export function bind({
  args,
  controller,
  events,
  key,
  model,
  ref,
  state,
}: {
  args?: {};
  controller?: ControllerCtor<any>;
  events?: Partial<PropertyKeyToHandlerMap<any>>;
  key?: string;
  model?: ModelCtor<any>;
  ref?: string;
  state?: StateTuple<any>;
}): AnyBoundController {
  return {
    args: args ?? {},
    controller,
    disposer: new Disposable(),
    events: events ?? {},
    key,
    model,
    ref,
    state: state ?? [undefined, () => {}],
  };
}

interface AddController {
  kind: 'ac';
  element: SupportedElement;
  js: AnyBoundController;
}

interface AddUnbound {
  kind: 'au';
  element: SupportedElement;
  unboundEvents: UnboundEvents;
}

interface DisposeElement {
  kind: 'de';
  element: SupportedElement;
}

interface PatchController {
  kind: 'pc';
  element: SupportedElement;
  from: AnyBoundController|undefined;
  to: AnyBoundController|undefined;
}

interface PatchUnbound {
  kind: 'pu';
  element: SupportedElement;
  from: UnboundEvents|undefined;
  to: UnboundEvents|undefined;
}

type BinderAction = AddController|AddUnbound|DisposeElement|PatchController|PatchUnbound;

export class Binder implements Listener {

  private readonly actions: BinderAction[] = [];
  private promise: Promise<void>|undefined = undefined;

  createdElement(element: Element, props: Properties): void {
    if (props.js) {
      setBindingAttributes(element, props.js);
      this.pushAction({
        kind: 'ac',
        element: element as SupportedElement,
        js: props.js,
      })
    }
    if (props.unboundEvents) {
      this.pushAction({
        kind: 'au',
        element: element as SupportedElement,
        unboundEvents: props.unboundEvents,
      })
    }
  }

  patchedElement(element: Element, from: Properties, to: Properties): void {
    if (from.js || to.js) {
      this.pushAction({
        kind: 'pc',
        element: element as SupportedElement,
        from: from.js,
        to: to.js,
      });
    }
    if (from.unboundEvents || to.unboundEvents) {
      this.pushAction({
        kind: 'pu',
        element: element as SupportedElement,
        from: from.unboundEvents,
        to: to.unboundEvents,
      });
    }
  }

  removedNode(node: Node): void {
    if (node instanceof Element) {
      this.pushAction({
        kind: 'de',
        element: node as SupportedElement,
      });
    }
  }

  private pushAction(action: BinderAction): void {
    this.actions.push(action);
    this.ensurePromise();
  }

  private ensurePromise(): void {
    if (this.promise) {
      return;
    }
    this.promise = Promise.resolve().then(() => {
      // The vdom reports children before their parents, so a render that creates a controller waits
      // for the whole batch or else the models above it aren't bound yet.
      const renders: Array<() => void> = [];
      for (const action of this.actions) {
        if (action.kind === 'ac') {
          bindElement(action.element, action.js, renders);
        } else if (action.kind === 'au') {
          bindUnbound(action.element, action.unboundEvents);
        } else if (action.kind === 'de') {
          disposeBoundElementsIn(action.element);
        } else if (action.kind === 'pc') {
          patchController(action.element, action.from, action.to, renders);
        } else if (action.kind === 'pu') {
          patchUnbound(action.element, action.from, action.to);
        } else {
          checkExhaustive(action);
        }
      }
      this.actions.length = 0;
      this.promise = undefined;
      for (const render of renders) {
        render();
      }
    });
  }
}

const elementsToControllerSpecs = new WeakMap<SupportedElement, AnyBoundController>();
const elementsToModelSpecs = new WeakMap<SupportedElement, AnyBoundController>();
const elementsToUnboundDisposers = new WeakMap<SupportedElement, Disposable>();

interface BroadcastListener {
  handler: string;
  root: SupportedElement;
  spec: AnyBoundController;
}

// Lets a model's broadcast reach controllers that haven't been created yet.
const broadcastListeners = new Map<string, Set<BroadcastListener>>();

// A model-only element gets jsmodel rather than jscontroller. disposeBoundElementsIn looks for it.
// jscontroller would wrongly stop fetchControllerDeps from searching inside the element.
function setBindingAttributes(element: Element, spec: AnyBoundController): void {
  if (spec.controller) {
    element.setAttribute('jscontroller', '');
    if (spec.ref) {
      element.setAttribute('jsref', spec.ref);
    }
  }
  if (spec.model) {
    element.setAttribute('jsmodel', '');
  }
}

function bindElement(
    root: SupportedElement, spec: AnyBoundController, renders: Array<() => void>): void {
  if (spec.model) {
    bindModel(root, spec);
  }
  if (spec.controller) {
    bindController(root, spec, renders);
  }
}

function bindModel(root: SupportedElement, spec: AnyBoundController): void {
  elementsToModelSpecs.set(root, spec);
  spec.disposer.registerDisposer(() => {
    elementsToModelSpecs.delete(root);
  });
}

function bindController(
    root: SupportedElement, spec: AnyBoundController, renders: Array<() => void>): void {
  const disposer = spec.disposer;
  elementsToControllerSpecs.set(root, spec);
  disposer.registerDisposer(() => {
    elementsToControllerSpecs.delete(root);
  });

  for (const [event, handler] of Object.entries(spec.events)) {
    if (event === 'corgi') {
      continue;
    }

    bindEventListener(root, event, handler as string, disposer, /* fromParent= */ false);
  }

  for (const [eventSpec, handler] of spec.events.corgi ?? []) {
    const name = qualifiedName(eventSpec);
    let listeners = broadcastListeners.get(name);
    if (!listeners) {
      listeners = new Set();
      broadcastListeners.set(name, listeners);
    }
    const listener = {handler: handler as string, root, spec};
    listeners.add(listener);
    disposer.registerDisposer(() => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        broadcastListeners.delete(name);
      }
    });

    disposer.registerListener(
        root,
        name as any,
        e => {
          if (root === e.srcElement) {
            return;
          }

          e.preventDefault();
          e.stopPropagation();
          maybeInstantiateAndCall(root, spec, (controller: any) => {
            const method = controller[handler] as (e: CustomEvent<any>) => unknown;
            method.call(controller, e as CustomEvent<unknown>);
          });
        });
  }

  if (spec.events.render) {
    const handler = spec.events.render;
    renders.push(() => {
      // Disposed by a later action in the same batch
      if (elementsToControllerSpecs.get(root) !== spec) {
        return;
      }
      maybeInstantiateAndCall(root, spec, (controller: any) => {
        const method = controller[handler];
        method.apply(controller, []);
      });
    });
  }
}

function bindUnbound(element: SupportedElement, events: UnboundEvents): void {
  const disposer = new Disposable();
  elementsToUnboundDisposers.set(element, disposer);
  disposer.registerDisposer(() => {
    elementsToUnboundDisposers.delete(element);
  });

  for (const [event, handler] of Object.entries(events)) {
    if (event === 'corgi') {
      continue;
    }

    bindEventListener(element, event, handler as string, disposer, /* fromParent= */ true);
  }

  for (const [eventSpec, handler] of events.corgi ?? []) {
    // TODO: we used to check if root == e.srcElement and bail out if so. Why?
    bindEventListener(
        element, qualifiedName(eventSpec), handler, disposer, /* fromParent= */ true);
  }
}

// Unbound events start looking for their controller at the parent so that an element can carry
// both its own controller and unbound events handled by an ancestor's.
function bindEventListener(
    element: SupportedElement,
    event: string,
    handler: string,
    disposer: Disposable,
    fromParent: boolean): void {
  const cached: {
    root: SupportedElement|undefined;
    spec: AnyBoundController|undefined;
  } = {
    root: undefined,
    spec: undefined,
  };
  const invoker = (e: Event) => {
    if (isAnchorContextClick(e)) {
      return;
    }

    // Ensure default behavior doesn't navigate us off the page or submit a form or something. We
    // preventDefault on A+click here even though HistoryService will also call preventDefault
    // because we don't want to require the user uses HistoryService.
    const role = (element.getAttribute('role') ?? '').toUpperCase();
    if (
      (element.tagName === 'A' && event === 'click')
        || (element.tagName === 'BUTTON' || role === 'BUTTON')
        || element.tagName === 'INPUT'
        || element.tagName === 'TEXTAREA'
    ) {
      e.preventDefault();
    }
    e.stopPropagation();

    if (!cached.root || !cached.spec) {
      const root =
          parentFinder(
              fromParent ? element.parentElement as SupportedElement : element,
              (candidate: SupportedElement) => elementsToControllerSpecs.has(candidate));
      if (!root) {
        throw new Error(`Unable to find controller for event ${event}`);
      }
      const spec = checkExists(elementsToControllerSpecs.get(root));
      spec.disposer.registerDisposer(() => {
        cached.root = undefined;
        cached.spec = undefined;
      });

      cached.root = root;
      cached.spec = spec;
    }
    const root = cached.root;
    const spec = cached.spec;

    maybeInstantiateAndCall(root, spec, (controller: any) => {
      const method = controller[handler] as (e: any) => unknown;
      checkExists(
        method, `Cannot find method '${handler}' on controller ${controller.constructor.name}`)
          .call(controller, {
            actionElement: new QueryOne(element),
            targetElement: new QueryOne(e.target as SupportedElement),
            detail: e instanceof CustomEvent && 'detail' in e ? e.detail : e,
          });
    });
  };
  disposer.registerListener(element, event as any, invoker);
}

function maybeInstantiateAndCall<E extends SupportedElement, R>(
    root: E,
    spec: AnyBoundController,
    fn: (controller: AnyBoundController) => R): Future<R> {
  const ctor = checkExists(spec.controller);
  if (!spec.instance) {
    let deps;
    if (ctor.deps) {
      deps = fetchControllerDeps(ctor.deps(), root);
    } else {
      deps = resolvedFuture({});
    }

    spec.instance = deps.then(d => {
      const instance = new ctor({
        root,
        args: spec.args,
        deps: d,
        state: spec.state,
      });
      spec.disposer.registerDisposable(instance);
      return instance;
    });
  }

  return spec
    .instance
    .then(instance => fn(instance))
    .catch(e => {
      console.error(`Failed to construct controller ${ctor.name}`, e);
      throw e;
    });
}

function maybeInstantiateModel(root: SupportedElement, spec: AnyBoundController):
    Future<Model<any>> {
  if (!spec.modelInstance) {
    const ctor = checkExists(spec.model);
    // A model can depend on models above it. It can't depend on one on its own element, because
    // an element binds at most one model.
    const deps =
        ctor.deps
            ? fetchModelDeps(ctor.deps(), root.parentElement as SupportedElement|null)
            : resolvedFuture({});
    spec.modelInstance = deps.then(d => {
      const instance = new ctor({
        deps: d,
        broadcast: <S>(eventSpec: EventSpec<S>, detail: S) => {
          broadcast(root, ctor, eventSpec, detail);
        },
      });
      spec.disposer.registerDisposable(instance);
      return instance;
    });
  }
  return spec.modelInstance;
}

function findModel(from: SupportedElement|null, ctor: ModelCtor<any>): Future<Model<any>> {
  const root =
      from ? parentFinder(from, candidate => elementsToModelSpecs.get(candidate)?.model === ctor)
          : undefined;
  if (!root) {
    throw new Error(`Unable to find a ${ctor.name} model`);
  }
  return maybeInstantiateModel(root, checkExists(elementsToModelSpecs.get(root)));
}

function broadcast<S>(
    modelRoot: SupportedElement, ctor: ModelCtor<any>, eventSpec: EventSpec<S>, detail: S): void {
  const name = qualifiedName(eventSpec);
  for (const {handler, root, spec} of [...broadcastListeners.get(name) ?? []]) {
    if (!modelRoot.contains(root)) {
      continue;
    }
    const nearest =
        parentFinder(root, candidate => elementsToModelSpecs.get(candidate)?.model === ctor);
    if (nearest !== modelRoot) {
      continue;
    }

    maybeInstantiateAndCall(root, spec, (controller: any) => {
      const method = controller[handler] as (e: CustomEvent<S>) => unknown;
      method.call(controller, new CustomEvent(name, {detail}));
    });
  }
}

function patchController(
    element: SupportedElement,
    from: AnyBoundController|undefined,
    to: AnyBoundController|undefined,
    renders: Array<() => void>) {
  checkArgument(from ?? to, 'At least one of from or to must be defined');

  const was = elementsToControllerSpecs.get(element) ?? elementsToModelSpecs.get(element);
  if (
      was
          && from
          && to
          && from.controller === to.controller
          && from.key === to.key
          && from.model === to.model) {
    checkArgument(deepEqual(from.events, to.events), 'Patching events is not supported');
    checkArgument(deepEqual(from.ref, to.ref), 'Patching ref is not supported');
    const argsChanged = !deepEqual(was.args, to.args);
    was.args = to.args;
    // The controller's debouncer reads response.state[1] each fire, and
    // response.state is the same tuple as was.state at construction time. On a
    // parent re-render `to.state[1]` closes over the latest vdom handle, while
    // the original closes over an orphaned one — so updates from this
    // controller would land on a stale physical and be discarded by the
    // parent's next render. Mutate in place to keep the tuple current.
    if (to.state) {
      was.state[0] = to.state[0];
      was.state[1] = to.state[1];
    }
    if (was.instance && argsChanged) {
      was.instance.then(c => { c.updateArgs(to.args); });
    }
    return;
  }

  if (was) {
    was.disposer.dispose();
    element.removeAttribute('jscontroller');
    element.removeAttribute('jsmodel');
    element.removeAttribute('jsref');
  }

  if (to) {
    setBindingAttributes(element, to);
    bindElement(element, to, renders);
  }
}

function patchUnbound(
    element: SupportedElement,
    from: UnboundEvents|undefined,
    to: UnboundEvents|undefined) {
  checkArgument(from ?? to, 'At least one of from or to must be defined');

  if (deepEqual(from, to)) {
    return;
  }

  const was = elementsToUnboundDisposers.get(element);
  if (was) {
    was.dispose();
  }

  if (to) {
    bindUnbound(element, to);
  }
}

interface AnyServiceCtor {
  deps?(): DepsConstructorsFor<ServiceDeps>;
  new (response: any): Service<any>;
}

export const serviceSingletons = new Map<AnyServiceCtor, Promise<Service<any>>>();


function fetchControllerDeps<D extends ControllerDeps>(
    deps: DepsConstructorsFor<D>, root: SupportedElement): Future<D> {
  const response: D = {controllers: {}, controllerss: {}, models: {}, services: {}} as D;
  const promises: Array<Promise<unknown>> = [];

  for (const [key, ctor] of Object.entries(deps.models ?? {})) {
    promises.push(
        findModel(root, ctor as ModelCtor<any>).then(model => {
          response.models[key] = model;
        }));
  }

  for (const [key, untypedCtor] of Object.entries(deps.controllers ?? {})) {
    const ctor = untypedCtor as ControllerCtor<any>;

    const elements =
        elementFinder(
            root,
            candidate => candidate.getAttribute('jsref') === key,
            parent => !parent.hasAttribute('jscontroller'));
    if (elements.length > 1) {
      throw new Error(`Dependency key '${key}' matched ${elements.length} controllers`);
    } else if (elements.length === 0) {
      throw new Error(`Dependency key '${key}' did not match any controllers`);
    }

    const element = elements[0];
    const spec = checkExists(elementsToControllerSpecs.get(element));
    promises.push(
        maybeInstantiateAndCall(element, spec, (controller: any) => {
          if (ctor !== controller.constructor) {
            throw new Error(
              `Dependency key '${key}' expected ${ctor.name} controller but found ` +
                controller.constructor.name
            );
          }
          response.controllers[key] = controller;
        }));
  }

  for (const [key, untypedCtor] of Object.entries(deps.controllerss ?? {})) {
    const ctor = untypedCtor as ControllerCtor<any>;

    const elements =
        elementFinder(
            root,
            candidate => candidate.getAttribute('jsref') === key,
            parent => !parent.hasAttribute('jscontroller'));

    const instances = [];
    for (const element of elements) {
      const spec = checkExists(elementsToControllerSpecs.get(element));
      instances.push(
          maybeInstantiateAndCall(element, spec, (controller: any) => {
            if (ctor !== controller.constructor) {
              throw new Error(
                `Dependency key '${key}' expected ${ctor.name} controller but found ` +
                  controller.constructor.name
              );
            }
            return controller;
          }));
    }

    promises.push(
        Promise.all(instances).then(is => {
          response.controllerss[key] = is;
        }));
  }

  return asFuture(Promise.all(promises))
      .then(() => fetchServiceDeps(deps))
      .then(sr => Object.assign(response, sr));
}

function fetchModelDeps<D extends ModelDeps>(
    deps: DepsConstructorsFor<D>, from: SupportedElement|null): Future<D> {
  const response: D = {models: {}, services: {}} as D;
  const promises: Array<Promise<unknown>> = [];
  for (const [key, ctor] of Object.entries(deps.models ?? {})) {
    promises.push(
        findModel(from, ctor as ModelCtor<any>).then(model => {
          response.models[key] = model;
        }));
  }
  return asFuture(Promise.all(promises))
      .then(() => fetchServiceDeps(deps))
      .then(sr => Object.assign(response, sr));
}

function instantiateService(ctor: AnyServiceCtor): Promise<Service<any>> {
  let deps;
  if (ctor.deps) {
    deps = fetchServiceDeps(ctor.deps());
  } else {
    deps = Promise.resolve({});
  }
  const instance = deps.then(d => new ctor({deps: d}));
  serviceSingletons.set(ctor, instance);
  return instance;
}

export function fetchServiceDeps<D extends ServiceDeps>(deps: DepsConstructorsFor<D>): Future<D> {
  const response = {services: {}} as D;
  const promises = [];
  for (const [key, untypedCtor] of Object.entries(deps.services ?? {})) {
    const ctor = untypedCtor as AnyServiceCtor;

    let service = serviceSingletons.get(ctor);
    if (!service) {
      service = instantiateService(ctor);
    }

    promises.push(service.then(instance => {
      response.services[key] = instance;
    }));
  }
  return asFuture(Promise.all(promises)).then(() => response);
}

export function disposeBoundElementsIn(node: Node): void {
  if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) {
    return;
  }
  // Disposes children first so a controller's dispose can still use its model.
  const roots = [node, ...node.querySelectorAll('[jscontroller], [jsmodel]')].reverse();
  for (const root of roots) {
    const element = root as SupportedElement;
    const spec = elementsToControllerSpecs.get(element) ?? elementsToModelSpecs.get(element);
    spec?.disposer.dispose();
  }
}

