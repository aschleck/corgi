import * as arrays from '../common/arrays';
import { checkArgument, checkExists } from '../common/asserts';
import { deepEqual } from '../common/comparisons';

import { AnyProperties, Properties } from './elements';

export const FRAGMENT_MARKER = Symbol();

type Handle = {__brand: 'Handle'} & {
  id: number;
};

interface VElement {
  tag: string|(typeof FRAGMENT_MARKER);
  children: VElementOrPrimitive[];
  handle: Handle;
  props: Properties;
  childTrace: Handle[];
  factorySource: FactorySource|undefined;
}

export type VElementOrPrimitive = VElement|number|string;

export type ElementFactory = (
  props: Properties,
  state: unknown|undefined,
  updateState: (newState: unknown) => void) => VElementOrPrimitive;

interface FactorySource {
  factory: ElementFactory;
  children: VElementOrPrimitive[];
  props: Properties;
  state: unknown;
};

export interface Listener {
  createdElement(element: Element, props: Properties): void;
  patchedElement(element: Element, from: Properties, to: Properties): void;
  removedNode(node: Node): void;
}

// Physical elements track the actual DOM elements that were created based upon a virtual element.
interface PhysicalElement {
  parent: Element;
  self: Node|undefined; // undefined in the case of a fragment element
  placeholder: Node|undefined; // set in empty fragments
  childHandles: Handle[];
  childTrace: Handle[];
  factorySource: FactorySource|undefined;
  props: Properties;
}

const listeners: Listener[] = [];

export function addListener(listener: Listener): void {
  listeners.push(listener);
}

export function createVirtualElement(
    element: keyof HTMLElementTagNameMap|ElementFactory,
    props: Properties|null,
    ...children: Array<VElementOrPrimitive|VElementOrPrimitive[]>): VElementOrPrimitive {
  const handle = createHandle();
  const flatChildren = deepFlatten(children);

  if (element instanceof Function) {
    const updateState = (newState: unknown) => {
      const physical = createdElements.get(handle);
      if (!physical) {
        return;
      }

      // Check to see if the element we're updating even still exists.
      if (!physical.parent.contains(findLastChildOrPlaceholder(physical))) {
        return;
      }

      if (creationTrace.length > 0) {
        console.error("creationTrace already set");
      }

      creationTrace.push([]);
      lastCreationTrace.push([...physical.childTrace]);
      let result;
      try {
        result = wrap(element({children: flatChildren, ...props}, newState, updateState));
      } catch (e: unknown) {
        creationTrace.pop();
        throw e;
      } finally {
        lastCreationTrace.pop();
      }

      result.handle = handle;
      result.childTrace = checkExists(creationTrace.pop());
      result.factorySource = {
        factory: element,
        children: flatChildren,
        props: props ?? {},
        state: newState,
      };
      patchChildren(physical.parent, [handle], [result], /* placeholder= */ undefined);
    };

    const lastTrace = lastCreationTrace[lastCreationTrace.length - 1];
    const lastHandle = lastTrace?.shift();
    const lastPhysical = lastHandle ? createdElements.get(lastHandle) : undefined;
    const lastFactorySource = lastPhysical?.factorySource;
    const lastFactory = lastFactorySource?.factory;

    let state;
    if (lastFactory && deepEqual(lastFactory, element)) {
      state = lastFactorySource.state;
    } else {
      state = undefined;
    }

    // Push ourselves into our parent's trace, if it exists.
    creationTrace[creationTrace.length - 1]?.push(handle);

    creationTrace.push([]);
    let result;
    try {
      result =
          wrap(
              element({
                children: flatChildren,
                ...props,
              },
              state,
              updateState));
    } catch (e: unknown) {
      creationTrace.pop();
      throw e;
    }
    result.childTrace = checkExists(creationTrace.pop());
    result.handle = handle;
    result.factorySource = {
      factory: element,
      children: flatChildren,
      props: props ?? {},
      state,
    };
    return result;
  } else {
    return {
      tag: element,
      children: flatChildren,
      handle,
      props: props ?? {},
      childTrace: [],
      factorySource: undefined,
    };
  }
}

export function appendElement(parent: Element, child: VElementOrPrimitive): void {
  appendChildrenToRoot([child], [maybeCreateHandle(child)], parent);
}

export function hydrateElement(parent: Element, to: VElementOrPrimitive): void {
  const children = [...parent.childNodes];
  checkArgument(children.length < 2, 'Cannot have more than one child');
  if (children.length === 0) {
    parent.appendChild(new Text(''));
  }

  try {
    hydrateElementRecursively(to, maybeCreateHandle(to), parent, /** left= */ undefined);
  } catch (e: unknown) {
    console.error('Error while hydrating page');
    throw e;
  }
}

function hydrateElementRecursively(
    element: VElementOrPrimitive, handle: Handle, parent: Element, left: Node|undefined): {
      childHandles: Handle[];
      last: Node;
    } {
  if (!(element instanceof Object)) {
    let node: Node;
    if (element === '') {
      node = new Text('');
      parent.insertBefore(node, left?.nextSibling ?? parent.childNodes[0]);
    } else {
      node = checkExists(left?.nextSibling ?? parent.childNodes[0]);
      checkArgument(node instanceof Text, 'Node should be text');
      // When passed from the server, \r\n turns into \n
      const need = String(element).replaceAll('\r\n', '\n');
      const current = node.textContent ?? '';
      checkArgument(current.startsWith(need), 'Text should match');
      if (current.length > need.length && current.startsWith(need)) {
        const actual = new Text(need);
        parent.insertBefore(actual, node);
        node.textContent = current.substring(need.length);
        node = actual;
      }
    }

    createdElements.set(
        handle, {
          parent,
          self: node,
          placeholder: undefined,
          childHandles: [],
          childTrace: [],
          factorySource: undefined,
          props: {},
        });
    return {
      childHandles: [],
      last: node,
    };
  }

  if (element.tag === FRAGMENT_MARKER) {
    const childHandles = [];
    let childLeft = left;
    for (const child of element.children) {
      const handle = maybeCreateHandle(child);
      const r = hydrateElementRecursively(child, handle, parent, childLeft);
      childHandles.push(handle);
      childLeft = r.last ?? childLeft;
    }

    const placeholder = new Text('');
    if (childHandles.length === 0) {
      parent.insertBefore(placeholder, left?.nextSibling ?? null);
      childLeft = placeholder;
    }

    createdElements.set(
        handle, {
          parent,
          self: undefined,
          placeholder,
          childHandles,
          childTrace: element.childTrace,
          factorySource: element.factorySource,
          props: element.props,
        });
    return {
      childHandles,
      last: checkExists(childLeft),
    };
  } else {
    const node = checkExists(left?.nextSibling ?? parent.childNodes[0]) as Element;
    checkArgument(element.tag === node.tagName.toLowerCase());

    const childHandles = [];
    let childLeft = undefined;
    for (const child of element.children) {
      const handle = maybeCreateHandle(child);
      const r = hydrateElementRecursively(child, handle, node, childLeft);
      childHandles.push(handle);
      childLeft = r.last ?? childLeft;
    }

    createdElements.set(
        handle, {
          parent,
          self: node,
          placeholder: undefined,
          childHandles,
          childTrace: element.childTrace,
          factorySource: element.factorySource,
          props: element.props,
        });
    listeners.forEach(l => { l.createdElement(node, element.props) });
    return {
      childHandles,
      last: node,
    };
  }
}

class VdomCaching {

  on: boolean = true;

  disable(): void {
    this.on = false;
  }

  enable(): void {
    this.on = true;
  }
}

export const vdomCaching = new VdomCaching();

const TAG_TO_NAMESPACE = new Map([
  ['circle', 'http://www.w3.org/2000/svg'],
  ['g', 'http://www.w3.org/2000/svg'],
  ['line', 'http://www.w3.org/2000/svg'],
  ['path', 'http://www.w3.org/2000/svg'],
  ['polyline', 'http://www.w3.org/2000/svg'],
  ['rect', 'http://www.w3.org/2000/svg'],
  ['svg', 'http://www.w3.org/2000/svg'],
  ['text', 'http://www.w3.org/2000/svg'],
]);

const createdElements = new WeakMap<Handle, PhysicalElement>();
const creationTrace: Array<Handle[]> = [];
const lastCreationTrace: Array<Handle[]> = [];

function* createElement(element: VElementOrPrimitive, handle: Handle, parent: Element):
    Generator<Node, void, void> {
  if (!(element instanceof Object)) {
    const node = new Text(String(element));
    createdElements.set(
        handle, {
          parent,
          self: node,
          placeholder: undefined,
          childHandles: [],
          childTrace: [],
          factorySource: undefined,
          props: {},
        });
    yield node;
    return;
  }

  const childHandles = [];
  for (const child of element.children) {
    childHandles.push(maybeCreateHandle(child));
  }

  if (element.tag === FRAGMENT_MARKER) {
    const created = [];
    for (let i = 0; i < element.children.length; ++i) {
      const child = element.children[i];
      const handle = childHandles[i];
      for (const r of createElement(child, handle, parent)) {
        created.push(r);
      }
    }
    let placeholder = new Text('');
    createdElements.set(
        handle, {
          parent,
          self: undefined,
          placeholder,
          childHandles,
          childTrace: element.childTrace,
          factorySource: element.factorySource,
          props: element.props,
        });
    if (childHandles.length === 0) {
      yield placeholder;
    } else {
      for (const child of created) {
        yield child;
      }
    }
  } else {
    const namespace = TAG_TO_NAMESPACE.get(element.tag) ?? 'http://www.w3.org/1999/xhtml';
    const root = document.createElementNS(namespace, element.tag);
    appendChildrenToRoot(element.children, childHandles, root);
    patchProperties(root, {}, element.props);
    createdElements.set(
        handle, {
          parent,
          self: root,
          placeholder: undefined,
          childHandles,
          childTrace: element.childTrace,
          factorySource: element.factorySource,
          props: element.props,
        });
    listeners.forEach(l => { l.createdElement(root, element.props) });
    yield root;
  }
}

function appendChildrenToRoot(
    children: VElementOrPrimitive[], childHandles: Handle[], root: Element) {
  checkArgument(children.length === childHandles.length, 'Mismatched child elements and handles');
  for (let i = 0; i < children.length; ++i) {
    const child = children[i];
    const handle = childHandles[i];
    for (const result of createElement(child, handle, root)) {
      root.append(result);
    }
  }
}

function patchChildren(
    parent: Element, was: Handle[], is: VElementOrPrimitive[], placeholder: Node|undefined): {
      childHandles: Handle[];
      last: Node|undefined;
    } {
  const newHandles = [];
  let last;
  for (let i = 0; i < Math.min(is.length, was.length); ++i) {
    const wasElement = checkExists(createdElements.get(was[i]));
    const isElement = is[i];

    if (wasElement.self === undefined
        && (isElement instanceof Object && isElement.tag === FRAGMENT_MARKER)) {
      const handle = maybeCreateHandle(isElement);
      newHandles.push(handle);

      if (vdomCaching.on
          && isElement.factorySource
          && deepEqual(wasElement.factorySource, isElement.factorySource)) {
        // TODO: do we need to create everything?
        createdElements.set(handle, wasElement);
        last = findLastChildOrPlaceholder(wasElement);
        continue;
      }

      const placeholder = wasElement.placeholder;
      const result =
          patchChildren(parent, wasElement.childHandles, isElement.children, placeholder);
      last = result?.last ?? last;
      createdElements.set(
          handle, {
            parent,
            self: undefined,
            placeholder,
            childHandles: result.childHandles,
            childTrace: isElement.childTrace,
            factorySource: isElement.factorySource,
            props: isElement.props,
          });
    } else if (wasElement.self === undefined) {
      const result =
          patchChildren(parent, wasElement.childHandles, [isElement], wasElement.placeholder)
      last = result?.last ?? last;
      arrays.pushInto(newHandles, result.childHandles);
    } else if (!(isElement instanceof Object)) {
      const handle = createHandle();
      const replacements = [...createElement(isElement, handle, parent)];
      const sibling = wasElement.self.nextSibling;
      parent.replaceChild(replacements[0], wasElement.self);
      for (const listener of listeners) {
        listener.removedNode(wasElement.self);
      }
      replacements.slice(1).forEach(r => {parent.insertBefore(r, sibling)});
      newHandles.push(handle);
      last = replacements[replacements.length - 1];
    } else if (isElement.tag === FRAGMENT_MARKER) {
      const handle = maybeCreateHandle(isElement);
      newHandles.push(handle);
      const placeholder = new Text('');
      const result =
          patchChildren(parent, [was[i]], isElement.children, placeholder);
      last = result?.last ?? last;
      createdElements.set(
          handle, {
            parent,
            self: undefined,
            placeholder,
            childHandles: result.childHandles,
            childTrace: isElement.childTrace,
            factorySource: isElement.factorySource,
            props: isElement.props,
          });
    } else {
      newHandles.push(maybeCreateHandle(isElement));
      last = patchNode(wasElement, isElement) ?? last;
    }
  }

  const next = last ? last.nextSibling : (placeholder ?? null);
  for (let i = was.length; i < is.length; ++i) {
    const isElement = is[i];
    const handle = maybeCreateHandle(isElement);
    const adding = [...createElement(isElement, handle, parent)];
    for (const a of adding) {
      parent.insertBefore(a, next);
      last = a;
    }
    newHandles.push(handle);
  }

  if (placeholder && was.length < is.length && was.length === 0) {
    parent.removeChild(placeholder);
  }

  for (let i = is.length; i < was.length; ++i) {
    const wasElement = checkExists(createdElements.get(was[i]));

    if (wasElement.self === undefined) {
      patchChildren(parent, wasElement.childHandles, [], wasElement.placeholder);
      last = wasElement.placeholder;
    } else {
      if (placeholder) {
        parent.insertBefore(placeholder, wasElement.self);
        last = placeholder;
      }
      parent.removeChild(wasElement.self);
      for (const listener of listeners) {
        listener.removedNode(wasElement.self);
      }
    }
  }

  return {
    childHandles: newHandles,
    last,
  };
}

function patchNode(physical: PhysicalElement, to: VElement): Node|undefined {
  checkArgument(to.tag !== FRAGMENT_MARKER, 'patchNode cannot patch fragments');
  const self = checkExists(physical.self, 'patchNode cannot patch fragments');

  if (!(self instanceof Element) || to.tag !== self.tagName.toLowerCase()) {
    const parent = physical.parent;
    const replacements = [...createElement(to, to.handle, parent)];
    if (replacements.length === 0) {
      parent.removeChild(self);
      listeners.forEach(l => { l.removedNode(self) });
      return undefined;
    }
    const sibling = self.nextSibling;
    parent.replaceChild(replacements[0], self);
    listeners.forEach(l => { l.removedNode(self) });
    replacements.slice(1).forEach(r => {parent.insertBefore(r, sibling)});
    return replacements[replacements.length - 1];
  }

  createdElements.set(to.handle, physical);

  if (vdomCaching.on && to.factorySource && deepEqual(physical.factorySource, to.factorySource)) {
    return self;
  }

  const oldProps = physical.props;
  patchProperties(self, oldProps, to.props);
  physical.factorySource = to.factorySource;
  physical.props = to.props;
  const {childHandles} = patchChildren(self, physical.childHandles, to.children, undefined);
  physical.childHandles = childHandles;
  listeners.forEach(l => { l.patchedElement(self, oldProps, to.props) });

  return self;
}

function patchProperties(element: Element, from: AnyProperties, to: AnyProperties) {
  const oldPropKeys = Object.keys(from) as Array<keyof AnyProperties>;
  const newPropKeys = Object.keys(to) as Array<keyof AnyProperties>;
  for (const key of newPropKeys) {
    if (key === 'js' || key === 'unboundEvents') {
      continue;
    }

    if (!deepEqual(from[key], to[key])) {
      const value = to[key];
      if (key === 'autofocus') {
        if (value && element instanceof HTMLElement) {
          // Give the element a chance to be added to the page
          setTimeout(() => { element.focus(); }, 0);
        }
      } else if (key === 'className') {
        if (value) {
          element.setAttribute('class', String(value));
        } else {
          element.removeAttribute('class');
        }
      } else if (key === 'data') {
        const dataset = (element as HTMLElement).dataset;
        for (const k of Object.keys(dataset)) {
          delete dataset[k];
        }

        if (value) {
          for (const [k, v] of Object.entries(value)) {
            dataset[k] = v;
          }
        }
      } else if (
        key === 'value'
          && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
        if (value !== undefined) { // don't clear value if we are no longer forcing it
          // Only overwrite the value if the element isn't currently focused. If it's focused, the
          // user may be actively typing.
          //
          // There is an unfortunate edge case here: if some controller really wants to overwrite
          // what the user typed, then we have no way to actually do it here. But in that case I
          // think it's okay to make people drop down to raw DOM calls and
          // * blur the element prior to changing its value
          // * directly set element.value rather than asking Corgi to do it. Corgi wouldn't know
          //   about the change and there might be consequences, but that seems acceptable.
          if (document.activeElement !== element) {
            // Only update if the value actually changed to avoid unnecessary DOM mutations
            const newValue = String(value);
            if (element.value !== newValue) {
              element.value = newValue;
            }
          }
        }
      } else {
        const canonical = canonicalize(key);
        const value = to[key] as boolean|number|string|undefined;
        if (value === undefined) {
          element.removeAttribute(key);
        } else if (typeof value === 'boolean') {
          if (canonical === 'checked') {
            (element as HTMLInputElement).checked = value;
          } else if (canonical === 'draggable') {
            (element as HTMLElement).draggable = value;
          } else if (value) {
            element.setAttribute(canonical, '');
          } else {
            // TODO(april): is there a reason we shouldn't do this?
            element.removeAttribute(canonical);
          }
        } else {
          element.setAttribute(canonical, String(value));
        }
      }
    }
  }

  for (const key of oldPropKeys) {
    const canonical = canonicalize(key);
    if (!to.hasOwnProperty(key)) {
      if (key === 'data') {
        const dataset = (element as HTMLElement).dataset ?? {};
        for (const k of Object.keys(dataset)) {
          delete dataset[k];
        }
      } else {
        element.removeAttribute(key === 'className' ? 'class' : canonical);
      }
    } else if (typeof to[key] === 'boolean' && !to[key]) {
      element.removeAttribute(canonical);
    }
  }
}

let nextElementId = 0;

export function canonicalize(key: string): string {
  if (key === 'viewBox') {
    return key;
  } else {
    let k = '';
    for (let c of key) {
      if ('A' <= c && c <= 'Z') {
        k = `${k}-${c.toLowerCase()}`;
      } else {
        k = `${k}${c}`;
      }
    }
    return k;
  }
}

function createHandle(): Handle {
  return {id: ++nextElementId} as Handle;
}

function deepFlatten<V>(items: Array<V | V[]>): V[] {
  const flattened: V[] = [];
  for (const item of items) {
    if (Array.isArray(item)) {
      flattened.push(...deepFlatten(item));
    } else {
      flattened.push(item);
    }
  }
  return flattened;
}

function findLastChildOrPlaceholder(element: PhysicalElement): Node {
  if (element.self) {
    return element.self;
  } else {
    if (element.childHandles.length > 0) {
      const last = element.childHandles[element.childHandles.length - 1];
      const child = checkExists(createdElements.get(last));
      return findLastChildOrPlaceholder(child);
    } else {
      return checkExists(element.placeholder);
    }
  }
}

function maybeCreateHandle(element: VElementOrPrimitive): Handle {
  if (element instanceof Object) {
    return element.handle;
  } else {
    return createHandle();
  }
}

export function Fragment({children}: {children: VElementOrPrimitive[]}): VElement {
  return {
    tag: FRAGMENT_MARKER,
    children,
    childTrace: [],
    handle: createHandle(),
    factorySource: undefined,
    props: {},
  };
}

function wrap(element: VElementOrPrimitive): VElement {
  return Fragment({children: [element]});
}

