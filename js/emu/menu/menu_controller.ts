import { checkExhaustive, checkExists } from '../../common/asserts';
import { Controller, Response } from '../../corgi/controller';
import { EmptyDeps } from '../../corgi/deps';
import { QueryOne } from '../../corgi/dom';
import {
  CorgiEvent,
  DOM_FOCUS,
  DOM_KEYBOARD,
  DOM_MOUSE,
  DOM_POINTER,
} from '../../corgi/events';
import { VElementOrPrimitive } from '../../corgi/vdom';
import { CHANGED, PRESSED } from '../events';

export interface Divider {
  kind: 'divider';
}

export interface Menu {
  kind: 'menu';
  label: string;
  disabled?: boolean;
  icon?: VElementOrPrimitive;
  items: MenuEntries;
}

export interface MenuItem {
  kind: 'menu_item';
  label: string;
  disabled?: boolean;
  icon?: VElementOrPrimitive;
  shortcut?: string;
  action: () => void;
}

export interface CheckboxMenuItem {
  kind: 'checkbox_menu_item';
  label: string;
  checked: boolean;
  disabled?: boolean;
  shortcut?: string;
  action: () => void;
}

export type MenuEntry = CheckboxMenuItem | Divider | Menu | MenuItem;
export type MenuEntries = MenuEntry[];

export interface Args {
  items: MenuEntries;
}

export interface State {
  active: number[];
  items: MenuEntries;
  mode: 'normal' | 'searching';
  search: string;
  searchIndex: number;
  searchResults: Array<{context: string[]; item: CheckboxMenuItem | MenuItem}>;
}

export class MenuController extends Controller<
  Args,
  EmptyDeps,
  HTMLElement,
  State
> {
  constructor(response: Response<MenuController>) {
    super(response);

    if (this.state.mode === 'searching') {
      this.searchNeedle('');
    }
  }

  close(): void {
    this.root.remove();
  }

  maybeClickClose(e: CorgiEvent<typeof DOM_MOUSE>): void {
    if (e.targetElement.element() === this.root) {
      this.close();
    }
  }

  focused(e: CorgiEvent<typeof DOM_FOCUS>): void {
    this.updateState({
      ...this.state,
      active: this.calculateActive(e.actionElement),
    });
  }

  keyPressed(e: CorgiEvent<typeof DOM_KEYBOARD>): void {
    const active = this.state.active;
    let newActive = undefined;
    if (e.detail.key === 'Enter') {
      this.select(active);
    } else if (e.detail.key === 'Escape') {
      this.close();
    } else if (e.detail.key === 'ArrowLeft') {
      if (active.length === 1) {
        this.close();
      } else {
        newActive = active.slice(0, active.length - 1);
      }
    } else if (e.detail.key === 'ArrowRight') {
      const {item} = this.findActiveItem(active);
      if (item.kind === 'menu' && !item.disabled) {
        newActive = [...active, 0];
      }
    } else if (e.detail.key === 'ArrowDown') {
      const {parent} = this.findActiveItem(active);
      newActive = active.slice(0, active.length - 1);
      const current = active[active.length - 1];
      const count = parent.items.length;
      newActive.push((current + 1) % count);
    } else if (e.detail.key === 'ArrowUp') {
      const {parent} = this.findActiveItem(active);
      newActive = active.slice(0, active.length - 1);
      const current = active[active.length - 1];
      const count = parent.items.length;
      newActive.push((current - 1 + count) % count);
    } else if (e.detail.key.length === 1) {
      // .length === 1 is a simple check to avoid Meta, Shift, F12, etc
      return this.searchChanged({
        actionElement: e.actionElement,
        targetElement: e.targetElement,
        detail: {value: this.state.search + e.detail.key},
      });
    }

    if (newActive) {
      this.updateState({
        ...this.state,
        active: newActive,
      });
    }
  }

  pointerEntered(e: CorgiEvent<typeof DOM_POINTER>): void {
    this.updateState({
      ...this.state,
      active: this.calculateActive(e.actionElement),
    });
  }

  selected(e: CorgiEvent<typeof DOM_MOUSE>): void {
    this.select(this.calculateActive(e.actionElement));
  }

  searchAction(): void {
    const result = this.state.searchResults[this.state.searchIndex];
    if (!result) return;
    if (result.item.disabled) return;
    result.item.action();
    this.close();
  }

  searchChanged(e: CorgiEvent<typeof CHANGED>): void {
    this.searchNeedle(e.detail.value);
  }

  private searchNeedle(query: string): void {
    const results: Array<{
      context: string[];
      item: CheckboxMenuItem | MenuItem;
      score: number;
    }> = [];
    const needle = query.toLowerCase();
    const dive = (item: MenuEntry, context: string[]) => {
      if (item.kind === 'menu') {
        for (const subitem of item.items) {
          dive(subitem, [...context, item.label]);
        }
      } else if (
        item.kind === 'menu_item' ||
        item.kind === 'checkbox_menu_item'
      ) {
        const label = item.label.toLocaleLowerCase();
        const fq = [context, item.label].join(' ').toLocaleLowerCase();
        const scored = [];
        for (const haystack of [label, fq]) {
          let score = undefined;
          if (haystack.startsWith(needle)) {
            score = -needle.length;
          } else if (haystack.indexOf(needle) >= 0) {
            score = 100 - needle.length;
          } else {
            let first = -1;
            let last = -1;
            for (const c of needle) {
              for (; last < haystack.length; ++last) {
                if (c === haystack[last]) {
                  if (first < 0) {
                    first = last;
                  }
                  break;
                }
              }
            }
            if (last < haystack.length) {
              score = 200 - needle.length + (last - first);
            }
          }

          if (score !== undefined) {
            scored.push({context, item, score});
          }
        }
        scored.sort((a, b) => a.score - b.score);
        const maybeFirst = scored[0];
        if (maybeFirst) {
          results.push(maybeFirst);
        }
      } else if (item.kind === 'divider') {
        // skip
      } else {
        throw checkExhaustive(item);
      }
    };
    for (const item of this.state.items) {
      dive(item, []);
    }

    results.sort((a, b) => a.score - b.score);

    this.updateState({
      ...this.state,
      mode: 'searching',
      search: query,
      searchIndex: 0,
      searchResults: results,
    });
  }

  searchPointerEntered(e: CorgiEvent<typeof DOM_MOUSE>): void {
    this.updateState({
      ...this.state,
      searchIndex: checkExists(e.actionElement.data('i')).number(),
    });
  }

  searchPressed(e: CorgiEvent<typeof PRESSED>): void {
    let direction;
    if (e.detail.key === 'ArrowDown') {
      direction = 1;
    } else if (e.detail.key === 'ArrowUp') {
      direction = -1;
    } else if (e.detail.key === 'Escape') {
      return this.close();
    } else {
      return;
    }
    const current = this.state.searchIndex;
    const length = this.state.searchResults.length;
    if (length === 0) return;
    this.updateState({
      ...this.state,
      searchIndex: (current + direction + length) % length,
    });
  }

  private select(active: number[]): void {
    const {item} = this.findActiveItem(active);
    if (item.kind === 'menu_item' || item.kind === 'checkbox_menu_item') {
      if (item.disabled) return;
      item.action();
      this.close();
    }
  }

  private calculateActive(target: QueryOne): number[] {
    target.element().focus();

    const chain = [];
    let cursor = target;
    while (this.root.contains(cursor.element())) {
      chain.unshift(checkExists(cursor.data('index')).number());
      try {
        cursor = cursor.parent('[data-index]');
      } catch (e: unknown) {
        break;
      }
    }
    return chain;
  }

  private findActiveItem(active: number[]): {parent: Menu; item: MenuEntry} {
    let cursor: Menu = {
      kind: 'menu',
      label: '',
      items: this.state.items,
    };
    for (let i = 0; i < active.length - 1; ++i) {
      cursor = cursor.items[active[i]] as Menu;
    }
    return {parent: cursor, item: cursor.items[active[active.length - 1]]};
  }
}
