import * as corgi from '../corgi';

import { ButtonController, State } from './button_controller';

type ButtonProps = {
  children?: corgi.VElementOrPrimitive[],
} & corgi.ButtonProperties;

export function Button(
    {ariaLabel, children, className, ...props}: ButtonProps,
    state: State|undefined,
    updateState: (newState: State) => void) {
  if (!state) {
    state = {};
  }

  // TODO(april): I think this is wrapped in a label so we can put unboundEvents on it without
  // having them sent to the ButtonController. But this really messes up padding classes. How to
  // fix?
  return <>
    <label className={'inline-block' + (className ? ` ${className}` : '')} {...props}>
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
          className={'h-full [text-align:inherit] w-full'}
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

