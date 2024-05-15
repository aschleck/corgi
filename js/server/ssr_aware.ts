import { deepEqual } from '../common/comparisons';
import { debugMode } from '../common/debug';
import { Future, asFuture } from '../common/futures';
import { maybeMemoized } from '../common/memoized';
import { fetchGlobalDeps } from '../corgi/deps';
import { HistoryService } from '../corgi/history/history_service';

export interface DataKey {
  type: string;
}

declare global {
  interface Window {
    INITIAL_DATA?: Array<[key: DataKey, value: object]>;
    SERVER_SIDE_RENDER?: {
      cookies(): string;
      currentUrl(): string;
      fetchDataBatch(keys: DataKey[]): Future<object[]>;
      language(): string;
      redirectTo(url: string): void;
      setTitle(title: string): void;
    };
  }
}

class FakeMemoized<T> {

  constructor(private readonly fn: () => T) {}

  get value(): T {
    return this.fn();
  }
}

export function currentUrl(): URL {
  return new URL(window.SERVER_SIDE_RENDER?.currentUrl() ?? window.location.href);
}

export function fetchDataBatch(keys: DataKey[]): Future<object[]> {
  if (window.SERVER_SIDE_RENDER) {
    return window.SERVER_SIDE_RENDER.fetchDataBatch(keys);
  } else {
    const p = fetch('/api/data', {
      method: 'POST',
      body: JSON.stringify({keys}),
      headers: {'Content-Type': 'application/json'},
    })
        .then(response => response.json())
        .then(response => response.values);
    return asFuture(p);
  }
}

export function initialData(): Array<[key: DataKey, value: object]> {
  return window.INITIAL_DATA ?? [];
}

export function isServerSide(): boolean {
  return !!window.SERVER_SIDE_RENDER;
}

export function getLanguage(): string {
  return window.SERVER_SIDE_RENDER?.language() ?? window.navigator?.language ?? 'unknown';
}

export function redirectTo(url: string): void {
  if (window.SERVER_SIDE_RENDER) {
    window.SERVER_SIDE_RENDER.redirectTo(url);
  } else {
    fetchGlobalDeps({
      services: {history: HistoryService},
    }).then(deps => {
      deps.services.history.replaceTo(url);
    });
  }
}

export function setTitle(title: string): void {
  if (window.SERVER_SIDE_RENDER) {
    window.SERVER_SIDE_RENDER.setTitle(title);
  } else {
    document.title = title;
  }
}

