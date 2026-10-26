import * as corgi from '../corgi';
import { Controller, Response } from '../corgi/controller';
import { EmptyDeps } from '../corgi/deps';
import { CorgiEvent, DOM_MOUSE, EventSpec } from '../corgi/events';
import { Service } from '../corgi/service';

import { CLOSE } from './events';

export class DialogService extends Service<EmptyDeps> {

  display(content: corgi.VElementOrPrimitive): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        corgi.appendElement(
          document.body, <Dialog resolve={resolve} reject={reject}>{content}</Dialog>);
      } catch (e: unknown) {
        console.error(e);
        reject();
      }
    });
  }
}

interface Args {
  resolve: () => void;
  reject: () => void;
}

interface State {}

class DialogController extends Controller<Args, EmptyDeps, HTMLDivElement, State> {

  private readonly args: Args;

  constructor(response: Response<DialogController>) {
    super(response);
    this.args = response.args;
  }

  // This is a bit of a lie, it could be any DOM_* event, but we don't really care
  close<E extends EventSpec<typeof CLOSE | typeof DOM_MOUSE>>(e: CorgiEvent<E>): void {
    this.root.remove();
    if ('kind' in e.detail) {
      if (e.detail.kind === 'resolve') {
        this.args.resolve();
      } else {
        this.args.reject();
      }
    } else {
      this.args.resolve();
    }
  }

  outsideClose(e: CorgiEvent<typeof DOM_MOUSE>): void {
    this.root.remove();
    this.args.reject();
  }
}

function Dialog(
  {children, resolve, reject}: {
    children?: corgi.VElementOrPrimitive;
    resolve: () => void;
    reject: () => void;
  },
  state: State|undefined,
  updateState: (newState: State) => void,
) {
  if (!state) {
    state = {};
  }

  return <>
    <div
        js={corgi.bind({
          controller: DialogController,
          args: {resolve, reject},
          state: [state, updateState],
          events: {
            corgi: [[CLOSE, 'close']],
          },
        })}
        className="fixed flex inset-0 items-center justify-center z-50">
      <div
          className="absolute bg-black/25 inset-0 dark:bg-black/50"
          unboundEvents={{click: 'outsideClose'}}
      >
      </div>
      <div className="max-h-[90vh] max-w-[90vw] overflow-y-auto relative">
        {children}
      </div>
    </div>
  </>;
}

