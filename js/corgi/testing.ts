import { serviceSingletons } from './binder';

export function disposeAllServices(): void {
  for (const promise of serviceSingletons.values()) {
    promise.then(service => {
      service.dispose();
    }).catch(() => {
      // Ignore errors from services that failed to die
    });
  }
  serviceSingletons.clear();
}
