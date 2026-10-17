import * as corgi from '../corgi';

import { ButtonController, State } from './button_controller';

export type ButtonProps = {
  children?: corgi.VElementOrPrimitive[],
  ref?: string,
} & corgi.ButtonProperties;

export function Button(
    {children, ref, ...props}: ButtonProps,
    state: State|undefined,
    updateState: (newState: State) => void) {
  if (!state) {
    state = {};
  }

  return <>
    <button
        js={corgi.bind({
          controller: ButtonController,
          events: {
            'click': 'clicked',
            'focusin': 'focused',
            'focusout': 'unfocused',
            'keyup': 'keyPressed',
          },
          ref,
          state: [state, updateState],
        })}
        {...props}
    >
      {children}
    </button>
  </>;
}

export function Link(
    {children, className, ref, ...props}: ButtonProps,
    state: State|undefined,
    updateState: (newState: State) => void) {
  if (!state) {
    state = {};
  }

  return <>
    <a
        js={corgi.bind({
          controller: ButtonController,
          events: {
            'click': 'clicked',
            'focusin': 'focused',
            'focusout': 'unfocused',
            'keyup': 'keyPressed',
          },
          ref,
          state: [state, updateState],
        })}
        {...props}
        className={'cursor-pointer' + (className ? ` ${className}` : '')}
    >
      {children}
    </a>
  </>;
}
