import { checkExists } from '../../common/asserts';
import * as corgi from '../../corgi';
import { disposeBoundElementsIn } from '../../corgi/binder';
import { EmptyDeps } from '../../corgi/deps';
import { Service } from '../../corgi/service';

import { MenuEntries } from './menu_controller';
import { MenuClassNames, MenuElement, Position } from './menu_element';

/** An open menu, for closing it from outside or asking whether it closed itself. */
export interface MenuHandle {
  close(): void;
  readonly isOpen: boolean;
}

export class MenuService extends Service<EmptyDeps> {
  open(
    items: MenuEntries,
    position: Position,
    parent: Element,
    options?: {
      accent?: number[];
      anchor?: 'first_item' | 'top_left';
      classes?: MenuClassNames;
      // See Args#trigger
      trigger?: Element;
    },
  ): MenuHandle {
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
        trigger={options?.trigger}
      />,
    );
    const element = checkExists(parent.lastElementChild);
    return {
      close: () => {
        if (element.isConnected) {
          // See MenuController#close
          element.remove();
          disposeBoundElementsIn(element);
        }
      },
      get isOpen() {
        return element.isConnected;
      },
    };
  }
}
