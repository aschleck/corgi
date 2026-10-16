import { checkExhaustive, checkExists } from '../../common/asserts';
import { disposeBoundElementsIn } from '../../corgi/binder';
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
  // A second, quieter line under the label
  detail?: string;
  disabled?: boolean;
  icon?: VElementOrPrimitive;
  shortcut?: string;
  action: () => void;
  // Called with true when the item becomes the active one and false when it stops being it, which
  // includes the menu closing
  onActive?: (active: boolean) => void;
}

// A row that shows something without doing anything, such as a reading with its value flush right
export interface InfoMenuItem {
  kind: 'info_menu_item';
  label: string;
  icon?: VElementOrPrimitive;
  value?: VElementOrPrimitive;
}

export interface CheckboxMenuItem {
  kind: 'checkbox_menu_item';
  label: string;
  checked: boolean;
  disabled?: boolean;
  shortcut?: string;
  action: () => void;
}

export type MenuEntry = CheckboxMenuItem | Divider | InfoMenuItem | Menu | MenuItem;
export type MenuEntries = MenuEntry[];

export interface Args {
  items: MenuEntries;
  // The element that opened the menu, whose presses are left to its own handler so that pressing
  // it again can close the menu instead of closing and reopening it
  trigger?: Element;
}

export interface State {
  active: number[];
  items: MenuEntries;
  mode: 'normal' | 'searching' | 'sheet';
  // The submenus a sheet has drilled into, as indices from the top level down
  opened: number[];
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
  private readonly triggerElement: Element|undefined;
  private activeItem: MenuItem|undefined;

  constructor(response: Response<MenuController>) {
    super(response);
    this.triggerElement = response.args.trigger;
    this.activeItem = undefined;

    // Binding waits a microtask, so a menu closed right after opening is already detached.
    if (!this.root.isConnected) {
      return;
    }

    // Capturing sees the press even when what it lands on stops it, and we let it carry on so that
    // a press outside both closes the menu and does what it would have done anyway.
    this.registerListener(document, 'pointerdown', e => {
      this.pressed(e);
    }, {capture: true});
    this.registerDisposer(() => {
      this.setActiveItem(undefined);
    });
    this.setActiveItem(activeItemIn(this.state));

    this.fitPopups();

    if (this.state.mode === 'searching') {
      this.searchNeedle('');
    }
  }

  // Popup positions come from estimated sizes, which don't know the caller's classes, so after
  // every render we measure what actually rendered and move it back inside the root. The render
  // happens synchronously inside the flush that resolves this promise.
  protected override updateState(newState: State): Promise<void> {
    this.setActiveItem(activeItemIn(newState));
    return super.updateState(newState).then(() => {
      this.fitPopups();
    });
  }

  // Removing the root doesn't dispose us, because only the vdom's own removals do that.
  close(): void {
    this.root.remove();
    disposeBoundElementsIn(this.root);
  }

  // The root only takes pointer events as a sheet's backdrop, which closes on the click instead of
  // the press so that the click doesn't land on the page under it.
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
    if (this.state.mode === 'sheet') {
      if (e.detail.key === 'Escape') {
        this.close();
      }
      return;
    } else if (e.detail.key === 'Enter') {
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
    } else if (e.detail.key === 'ArrowDown' || e.detail.key === 'ArrowUp') {
      const {parent} = this.findActiveItem(active);
      const step = e.detail.key === 'ArrowDown' ? 1 : -1;
      const count = parent.items.length;
      let next = active[active.length - 1];
      // Dividers and info rows can't be chosen, so the keys pass over them.
      for (let i = 0; i < count; ++i) {
        next = (next + step + count) % count;
        if (isSelectable(parent.items[next])) {
          break;
        }
      }
      newActive = [...active.slice(0, active.length - 1), next];
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

  sheetBack(): void {
    this.updateState({
      ...this.state,
      opened: this.state.opened.slice(0, -1),
    });
  }

  sheetSelected(e: CorgiEvent<typeof DOM_MOUSE>): void {
    const index = checkExists(e.actionElement.data('index')).number();
    const path = [...this.state.opened, index];
    const {item} = this.findActiveItem(path);
    if (item.kind === 'menu') {
      if (!item.disabled) {
        this.updateState({...this.state, opened: path});
      }
    } else {
      this.select(path);
    }
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
      } else if (item.kind === 'divider' || item.kind === 'info_menu_item') {
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

  // Shifts each popup that overflows the root back inside it, and caps its size to the root's. We go
  // in document order so a submenu is measured after its parent has already moved.
  private fitPopups(): void {
    const bound = this.root.getBoundingClientRect();
    if (bound.width === 0 || bound.height === 0) {
      return;
    }

    for (const popup of this.root.querySelectorAll<HTMLElement>('[data-menu-popup]')) {
      popup.style.translate = '';
      popup.style.maxWidth = `${bound.width}px`;
      const rect = popup.getBoundingClientRect();
      if (rect.height > bound.height) {
        // A scrolling popup clips its submenus, but it's that or clipping its own items.
        popup.style.maxHeight = `${bound.height}px`;
        popup.style.overflowY = 'auto';
      }
      const dx = shiftInto(rect.left, rect.right, bound.left, bound.right);
      const dy =
          shiftInto(rect.top, rect.top + Math.min(rect.height, bound.height), bound.top, bound.bottom);
      if (dx !== 0 || dy !== 0) {
        popup.style.translate = `${dx}px ${dy}px`;
      }
    }
  }

  private select(active: number[]): void {
    const {item} = this.findActiveItem(active);
    if (item.kind === 'menu_item' || item.kind === 'checkbox_menu_item') {
      if (item.disabled) return;
      item.action();
      this.close();
    }
  }

  private pressed(e: PointerEvent): void {
    const target = e.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (this.root.contains(target) || this.triggerElement?.contains(target)) {
      return;
    }
    this.close();
  }

  private setActiveItem(item: MenuItem|undefined): void {
    if (item === this.activeItem) {
      return;
    }
    const was = this.activeItem;
    this.activeItem = item;
    was?.onActive?.(false);
    item?.onActive?.(true);
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

function shiftInto(low: number, high: number, boundLow: number, boundHigh: number): number {
  if (high > boundHigh) {
    return Math.max(boundHigh - high, boundLow - low);
  } else if (low < boundLow) {
    return boundLow - low;
  } else {
    return 0;
  }
}

// The menu item that state's active path names, if the menu shows one as active
function activeItemIn(state: State): MenuItem|undefined {
  if (state.mode !== 'normal' || state.active.length === 0) {
    return undefined;
  }
  let items = state.items;
  let item: MenuEntry|undefined = undefined;
  for (const index of state.active) {
    item = items[index];
    if (item?.kind === 'menu') {
      items = item.items;
    }
  }
  return item?.kind === 'menu_item' ? item : undefined;
}

function isSelectable(item: MenuEntry): boolean {
  return item.kind === 'checkbox_menu_item' || item.kind === 'menu' || item.kind === 'menu_item';
}
