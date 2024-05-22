import {exists} from '../common/asserts';

export type SupportedElement = HTMLElement|SVGElement;

export class Query {

  constructor(private readonly frontier: SupportedElement[]) {
  }

  element(): SupportedElement {
    return this.one().frontier[0];
  }

  one(): QueryOne {
    if (this.frontier.length > 1) {
      throw new Error('More than one element in query');
    } else if (this.frontier.length === 0) {
      throw new Error('No elements in query');
    } else {
      return new QueryOne(this.frontier[0]);
    }
  }

  parent(selector?: string): Query {
    if (!selector) {
      return new Query(this.frontier.map(e => e.parentElement).filter(exists));
    }

    const novel = this.frontier.map(e => e.parentElement);
    let changed;
    do {
      changed = false;
      for (let i = 0; i < novel.length; ++i) {
        const e = novel[i];
        if (!e) {
          continue;
        }

        if (!e.matches(selector)) {
          novel[i] = e.parentElement;
          changed = true;
        }
      }
    } while (changed);
    return new Query(novel.filter(exists));
  }

  refs(ref: string): Query {
    const found = this.frontier.flatMap(e =>
        elementFinder(
            e,
            candidate => candidate.getAttribute('data-ref') === ref,
            parent => !parent.hasAttribute('data-js')));
    return new Query(found);
  }
}

export class QueryOne extends Query {

  constructor(private readonly e: SupportedElement) {
    super([e]);
  }

  attr(key: string): DataValue|undefined {
    const v = this.e.getAttribute(key);
    if (v === null) {
      return undefined;
    }
    return new DataValue(v);
  }

  data(key: string): DataValue|undefined {
    const v = this.e.dataset[key];
    if (v === undefined) {
      return undefined;
    }
    return new DataValue(v);
  }

  parent(selector?: string): QueryOne {
    let parent;
    if (!selector) {
      parent = this.e.parentElement;
    } else {
      let cursor = this.e.parentElement;
      while (cursor && !cursor.matches(selector)) {
        cursor = cursor.parentElement;
      }
      parent = cursor;
    }

    if (!parent) {
      throw new Error(`No parent element matches ${selector}`);
    }

    return new QueryOne(parent);
  }
}

export class DataValue {
  constructor(private readonly value: string) {}

  number(): number {
    const v = Number(this.value);
    if (Number.isNaN(v)) {
      throw new Error(`Not a number: ${this.value}`);
    }
    return v;
  }

  string(): string {
    return this.value;
  }
}

export function elementFinder(
    root: SupportedElement,
    filter: (element: Element) => boolean,
    continuer: (element: Element) => boolean): SupportedElement[] {
  const append = function(array: SupportedElement[], children: HTMLCollection) {
    for (let i = 0; i < children.length; ++i) {
      array.push(children[i] as SupportedElement);
    }
  };

  const selected: SupportedElement[] = [];
  const frontier: SupportedElement[] = [];
  append(frontier, root.children);
  while (frontier.length > 0) {
    const current = <SupportedElement>(frontier.shift());
    if (filter(current)) {
      selected.push(current);
    }
    if (continuer(current)) {
      append(frontier, current.children);
    }
  }
  return selected;
}

export function parentFinder(
    element: SupportedElement, matcher: (element: SupportedElement) => boolean):
        SupportedElement|undefined {
  let target = element;
  while (!matcher(target)) {
    target = target.parentElement as SupportedElement;
  }
  return target ?? undefined;
}

