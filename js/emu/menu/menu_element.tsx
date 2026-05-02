import { checkExhaustive } from '../../common/asserts';
import * as corgi from '../../corgi';
import { VElementOrPrimitive } from '../../corgi/vdom';
import { ACTION, CHANGED, PRESSED } from '../events';
import { Input } from '../input';

import {
  Args,
  MenuController,
  MenuEntries,
  MenuEntry,
  State,
} from './menu_controller';

export interface Position {
  x: number;
  y: number;
}

export interface MenuClassNames {
  // Applied to the popup container (and the search-mode container).
  popup?: string;
  // Applied to each item entry. State exposed via data attributes:
  // data-active, data-accent, data-disabled — use Tailwind data-[…] variants.
  item?: string;
  divider?: string;
}

export function MenuElement(
  {
    accent,
    anchor,
    bound,
    classes,
    items,
    position,
  }: {
    accent: number[];
    anchor: 'first_item' | 'top_left';
    bound: DOMRect;
    classes: MenuClassNames;
    items: MenuEntries;
    position: Position;
  },
  state: State | undefined,
  updateState: (newState: State) => void,
) {
  if (!state) {
    const size = estimateSize(items);
    const xFraction = size[0] / bound.width;
    const yFraction = size[1] / bound.height;
    state = {
      active: [0],
      items,
      mode: xFraction < 0.75 && yFraction < 0.75 ? 'normal' : 'searching',
      search: '',
      searchIndex: -1,
      searchResults: [],
    };
  }

  let anchored: [number, number];
  if (anchor === 'first_item') {
    anchored = [position.x - 48, position.y - 16];
  } else if (anchor === 'top_left') {
    anchored = [position.x, position.y + 4];
  } else {
    throw checkExhaustive(anchor);
  }

  const args: Args = {items};

  return (
    <div
      className="absolute inset-0"
      js={corgi.bind({
        args,
        controller: MenuController,
        events: {
          contextmenu: 'maybeClickClose',
          click: 'maybeClickClose',
          render: 'wakeup',
        },
        key: `${anchored[0]},${anchored[1]}`,
        state: [state, updateState],
      })}
    >
      {state.mode === 'normal' ? (
        <NormalMenu
          accent={accent}
          anchor={anchored}
          bound={bound}
          classes={classes}
          state={state}
        />
      ) : (
        <></>
      )}
      {state.mode === 'searching' ? (
        <SearchMenu anchor={anchored} classes={classes} state={state} />
      ) : (
        <></>
      )}
    </div>
  );
}

function NormalMenu({
  accent,
  anchor,
  bound,
  classes,
  state,
}: {
  accent: number[];
  anchor: [x: number, y: number];
  bound: DOMRect;
  classes: MenuClassNames;
  state: State;
}) {
  const active = state.active;
  const items = state.items;
  const size = estimateSize(items);
  const newAnchor = [
    Math.max(0, Math.min(anchor[0], bound.width - size[0])),
    Math.max(0, Math.min(anchor[1], bound.height - size[1])),
  ];
  return (
    <div
      className="absolute"
      style={`left: ${newAnchor[0]}px; top: ${newAnchor[1]}px`}
    >
      <SubMenu
        accent={accent}
        active={active}
        boundWidth={bound.width}
        classes={classes}
        flip={false}
        items={items}
        leftPx={newAnchor[0]}
      />
    </div>
  );
}

function SubMenu({
  accent,
  active,
  boundWidth,
  classes,
  flip,
  items,
  leftPx,
}: {
  accent: number[];
  active: number[];
  boundWidth: number;
  classes: MenuClassNames;
  flip: boolean;
  items: MenuEntries;
  leftPx: number;
}) {
  const width = estimateSize(items)[0];
  const rightPx = leftPx + width;
  const hasIcons = items.some(itemHasIcon);
  const base = `absolute -top-1 z-50 ${flip ? 'end-full' : 'start-full'}`;
  const cls = classes.popup ? `${base} ${classes.popup}` : base;
  return (
    <div className={cls}>
      {items.map((item, i) => (
        <Entry
          accent={accent}
          active={active}
          boundWidth={boundWidth}
          classes={classes}
          hasIcons={hasIcons}
          index={i}
          item={item}
          parentLeft={leftPx}
          parentRight={rightPx}
        />
      ))}
    </div>
  );
}

function Entry({
  accent,
  active,
  boundWidth,
  classes,
  hasIcons,
  index,
  item,
  parentLeft,
  parentRight,
}: {
  accent: number[];
  active: number[];
  boundWidth: number;
  classes: MenuClassNames;
  hasIcons: boolean;
  index: number;
  item: MenuEntry;
  parentLeft: number;
  parentRight: number;
}) {
  const isAccent = accent[0] === index;
  const isActive = active[0] === index;
  const lastActive = active.length === 1;
  const disabled =
    (item.kind === 'menu' ||
      item.kind === 'menu_item' ||
      item.kind === 'checkbox_menu_item') &&
    !!item.disabled;

  // Three-column row: icon | label | trailing. The icon column is only
  // reserved when at least one sibling actually has one, so menus without
  // icons or checkboxes don't pay for an empty gutter. Trailing uses
  // ms-auto to sit flush right when the popup is forced wider by a
  // sibling, with ps-4 providing a fixed minimum gap.
  const iconSlot = hasIcons
    ? <div className="w-4 shrink-0">{iconContent(item)}</div>
    : null;
  let element;
  if (item.kind === 'menu_item') {
    element = (
      <div className="flex items-center">
        {iconSlot}
        <div>{item.label}</div>
        {item.shortcut ? (
          <div className="ms-auto ps-4">{item.shortcut}</div>
        ) : null}
      </div>
    );
  } else if (item.kind === 'checkbox_menu_item') {
    element = (
      <div className="flex items-center">
        {iconSlot}
        <div>{item.label}</div>
        {item.shortcut ? (
          <div className="ms-auto ps-4">{item.shortcut}</div>
        ) : null}
      </div>
    );
  } else if (item.kind === 'menu') {
    const childWidth = estimateSize(item.items)[0];
    const flipChild = parentRight + childWidth > boundWidth;
    const childLeft = flipChild ? parentLeft - childWidth : parentRight;
    element = (
      <>
        <div className="flex items-center">
          {iconSlot}
          <div>{item.label}</div>
          <div className="ms-auto ps-4">›</div>
        </div>
        {isActive && !disabled ? (
          <SubMenu
            accent={isAccent ? accent.slice(1) : []}
            active={active.slice(1)}
            boundWidth={boundWidth}
            classes={classes}
            flip={flipChild}
            items={item.items}
            leftPx={childLeft}
          />
        ) : (
          <></>
        )}
      </>
    );
  } else if (item.kind === 'divider') {
    element = <div className={classes.divider ?? ''} />;
  } else {
    throw checkExhaustive(item);
  }

  const data: {[k: string]: string} = {index: String(index)};
  if (disabled) data.disabled = '';
  if (isAccent) data.accent = '';
  if (isActive) data.active = '';

  const baseItem = 'outline-none relative';
  const itemClass =
    item.kind === 'divider'
      ? baseItem
      : classes.item
        ? `${baseItem} ${classes.item}`
        : baseItem;

  return (
    <div
      autofocus={isActive && lastActive}
      className={itemClass}
      data={data}
      tabindex="0"
      unboundEvents={{
        click: 'selected',
        focus: 'focused',
        keyup: 'keyPressed',
        pointerenter: 'pointerEntered',
      }}
    >
      {element}
    </div>
  );
}

// Local extents only — submenus open beside their parent, so they don't
// contribute to the top-level popup's footprint (and including them
// over-clamps it leftward when the menu is opened near the right edge).
function estimateSize(items: MenuEntries): [width: number, height: number] {
  const iconWidth = items.some(itemHasIcon) ? 16 : 0;
  let width = 0;
  let height = 4;
  for (const item of items) {
    if (item.kind === 'divider') {
      height += 4;
      continue;
    }
    width = Math.max(width, iconWidth + 8 * item.label.length + 32 + 8);
    height += 24;
  }
  return [width, height];
}

function itemHasIcon(item: MenuEntry): boolean {
  if (item.kind === 'divider') return false;
  if (item.kind === 'checkbox_menu_item') return true;
  return item.icon !== undefined;
}

function iconContent(item: MenuEntry): VElementOrPrimitive {
  if (item.kind === 'checkbox_menu_item') return item.checked ? '✓' : '';
  if (item.kind === 'menu_item' || item.kind === 'menu') {
    return item.icon ?? '';
  }
  return '';
}

function SearchMenu({
  anchor,
  classes,
  state,
}: {
  anchor: [x: number, y: number];
  classes: MenuClassNames;
  state: State;
}) {
  const base = 'absolute start-full -top-1 z-50 max-h-72 overflow-y-auto';
  const cls = classes.popup ? `${base} ${classes.popup}` : base;
  return (
    <div className={cls} style={`left: ${anchor[0]}px; top: ${anchor[1]}px`}>
      <Input
        autofocus
        unboundEvents={{
          corgi: [
            [ACTION, 'searchAction'],
            [CHANGED, 'searchChanged'],
            [PRESSED, 'searchPressed'],
          ],
        }}
        value={state.search}
      />
      {state.searchResults.map((r, i) => {
        const baseRow = 'outline-none relative';
        const rowCls = classes.item
          ? `${baseRow} ${classes.item}`
          : baseRow;
        const data: {[k: string]: string} = {i: String(i)};
        if (state.searchIndex === i) data.active = '';
        return (
          <div className={rowCls} data={data} unboundEvents={{
            click: 'searchAction',
            pointerenter: 'searchPointerEntered',
          }}>
            <span>
              {r.context.join(' ▸ ')}
              {r.context.length > 0 ? ' ▸ ' : ''}
            </span>
            {r.item.label}
          </div>
        );
      })}
    </div>
  );
}
