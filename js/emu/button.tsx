import * as corgi from '../corgi';

import { ButtonController, State } from './button_controller';

export type ButtonProps = {
  children?: corgi.VElementOrPrimitive[],
} & corgi.ButtonProperties;

export function Button(
    {ariaLabel, children, className, ...props}: ButtonProps,
    state: State|undefined,
    updateState: (newState: State) => void) {
  if (!state) {
    state = {};
  }

  return <>
    <label className="inline-block" {...props}>
      <button
          js={corgi.bind({
            controller: ButtonController,
            events: {
              'click': 'clicked',
              'focusin': 'focused',
              'focusout': 'unfocused',
              'keyup': 'keyPressed',
            },
            state: [state, updateState],
          })}
          ariaLabel={ariaLabel}
          className={'h-full [text-align:inherit] w-full' + (className ? ` ${className}` : '')}
      >
        {children}
      </button>
    </label>
  </>;
}

export function Link(
    {children, className, ...props}: ButtonProps,
    state: State|undefined,
    updateState: (newState: State) => void) {
  if (!state) {
    state = {};
  }

  return <>
    <span {...props}>
      <a
          js={corgi.bind({
            controller: ButtonController,
            events: {
              'click': 'clicked',
              'focusin': 'focused',
              'focusout': 'unfocused',
              'keyup': 'keyPressed',
            },
            state: [state, updateState],
          })}
          className={'cursor-pointer' + (className ? ` ${className}` : '')}
      >
        {children}
      </a>
    </span>
  </>;
}

