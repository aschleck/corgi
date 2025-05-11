import {QueryOne, SupportedElement} from './dom';

export interface EventSpec<S> {
  name: string;
}

export type CorgiEvent<ES> = ES extends EventSpec<infer S> ? {
  // The element that bound the event
  actionElement: QueryOne;
  // The element that triggered the event
  targetElement: QueryOne;
  detail: S;
} : never;

export function declareEvent<S>(name: string): EventSpec<S> {
  return {
    name,
  };
}

export function qualifiedName<S>(spec: EventSpec<S>): string {
  return `corgi.${spec.name}`;
}

export const DOM_EVENT = declareEvent<Event>('corgi.domEvent');
export const DOM_FOCUS = declareEvent<FocusEvent>('corgi.domFocus');
export const DOM_INPUT = declareEvent<InputEvent>('corgi.domInput');
export const DOM_KEYBOARD = declareEvent<KeyboardEvent>('corgi.domKeyboard');
export const DOM_MOUSE = declareEvent<MouseEvent>('corgi.domMouse');
export const DOM_POINTER = declareEvent<PointerEvent>('corgi.domPointer');
