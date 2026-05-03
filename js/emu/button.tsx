import * as corgi from '../corgi';

import { ButtonController, State } from './button_controller';

export type ButtonProps = {
  children?: corgi.VElementOrPrimitive[],
  ref?: string,
} & corgi.ButtonProperties;

// `className` and `style` go on the inner element (the visible button/
// anchor) so callers can control its appearance with either. `data` and
// event handlers stay on the outer wrapper because that's where corgi
// listeners and actionElement are anchored.
export function Button(
    {ariaLabel, children, className, ref, style, tabindex, ...props}: ButtonProps,
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
            ref,
            state: [state, updateState],
          })}
          ariaLabel={ariaLabel}
          className={'h-full max-w-full [text-align:inherit]' + (className ? ` ${className}` : '')}
          style={style}
          tabindex={tabindex}
      >
        {children}
      </button>
    </label>
  </>;
}

export function Link(
    {children, className, ref, style, tabindex, ...props}: ButtonProps,
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
            ref,
            state: [state, updateState],
          })}
          className={'cursor-pointer' + (className ? ` ${className}` : '')}
          style={style}
          tabindex={tabindex}
      >
        {children}
      </a>
    </span>
  </>;
}

