import * as corgi from '../../corgi';
import { EmptyDeps } from '../../corgi/deps';
import { Service } from '../../corgi/service';

import { MenuEntries } from './menu_controller';
import { MenuClassNames, MenuElement, Position } from './menu_element';

export class MenuService extends Service<EmptyDeps> {
  open(
    items: MenuEntries,
    position: Position,
    parent: Element,
    options?: {
      accent?: number[];
      anchor?: 'first_item' | 'top_left';
      classes?: MenuClassNames;
    },
  ): void {
    const bound = parent.getBoundingClientRect();
    corgi.appendElement(
      parent,
      <MenuElement
        accent={options?.accent ?? []}
        anchor={options?.anchor ?? 'first_item'}
        bound={bound}
        classes={options?.classes ?? {}}
        items={items}
        position={position}
      />,
    );
  }
}
