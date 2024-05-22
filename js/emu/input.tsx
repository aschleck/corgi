import * as corgi from '../corgi';

import { InputController, State } from './input_controller';

type InputProps = {
  className?: string,
  forceValue?: boolean,
  icon?: corgi.VElementOrPrimitive,
  inset?: corgi.VElementOrPrimitive,
  name?: string,
  placeholder?: string,
  ref?: string,
} & corgi.InputProperties;

export function Input(
    {className, forceValue, icon, inset, name, placeholder, ref, value, ...props}: InputProps,
    state: State|undefined,
    updateState: (newState: State) => void) {
  if (!state) {
    state = {managed: true};
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
              'keyup': 'keyPressed',
            },
            ref,
            state: [state, updateState],
          })}
          className="bg-transparent grow outline-none placeholder-current"
          name={name}
          placeholder={placeholder ?? ''}
          value={forceValue || state.managed ? value : undefined}
      />
      {inset ?? ''}
    </label>
  </>;
}
