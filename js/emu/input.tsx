import * as corgi from '../corgi';

import { InputController, State } from './input_controller';

export type InputProps = {
  autofocus?: boolean,
  className?: string,
  forceValue?: boolean,
  icon?: corgi.VElementOrPrimitive,
  inset?: corgi.VElementOrPrimitive,
  name?: string,
  placeholder?: string,
  size?: number,
  ref?: string,
} & corgi.InputProperties;

export function Input(
    {
      autofocus,
      className,
      forceValue,
      icon,
      inset,
      name,
      placeholder,
      ref,
      size,
      value,
      ...props
    }: InputProps,
    state: State|undefined,
    updateState: (newState: State) => void) {
  if (!state) {
    state = {forcedValue: value, managed: true};
  }

  return <>
    <label
        className={
            'flex font-input gap-3 items-center'
                + (className ? ` ${className} ` : '')
        }
        {...props}
    >
      {icon ?? ''}
      <input
          js={corgi.bind({
            controller: InputController,
            args: {value},
            events: {
              'focusin': 'focused',
              'focusout': 'unfocused',
              // This fires for all types of input (typing, pasting, IME, etc.) and always reflects
              // the actual DOM value.
              'input': 'inputChanged',
              // Monitor keyup for handling special keys (Enter, Arrow, Escape)
              'keyup': 'keyUp',
            },
            ref,
            state: [state, updateState],
          })}
          autofocus={autofocus}
          className="bg-transparent grow max-w-full outline-none placeholder-current"
          name={name}
          placeholder={placeholder ?? ''}
          size={size}
          value={forceValue ? value : state.managed ? state.forcedValue : undefined}
      />
      {inset ?? ''}
    </label>
  </>;
}
