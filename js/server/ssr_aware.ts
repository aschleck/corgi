import {JsonValue} from '@bufbuild/protobuf';

import { checkExists } from '../common/asserts';
import { Future, asFuture } from '../common/futures';
import { fetchGlobalDeps } from '../corgi/deps';
import { HistoryService } from '../corgi/history/history_service';

export interface DataKey {
  method: string;
  request: JsonValue;
}

interface Result {
  kind: 'result';
  value: JsonValue;
}

interface Error {
  kind: 'error';
  code: number;
}

export type ServerResponse = Result | Error;

declare global {
  interface Window {
    INITIAL_DATA?: Array<[key: DataKey, value: ServerResponse]>;
    SERVER_SIDE_RENDER?: {
      cookies(): string;
      currentUrl(): string;
      requestDataBatch(keys: DataKey[]): Future<ServerResponse[]>;
      language(): string;
      redirectTo(url: string): void;
      setStatusCode(statusCode: number): void;
      setTitle(title: string): void;
    };
  }
}

export function currentUrl(): URL {
  let url;
  if (process.env.CORGI_FOR_BROWSER) {
    url = window.location.href;
  } else {
    url = checkExists(window.SERVER_SIDE_RENDER).currentUrl();
  }
  return new URL(url);
}

export function requestDataBatch(keys: DataKey[]): Future<ServerResponse[]> {
  if (process.env.CORGI_FOR_BROWSER) {
    const p = fetch('/api/data', {
      method: 'POST',
      body: JSON.stringify({keys}),
      headers: {'Content-Type': 'application/json'},
    })
        .then(response => response.json())
        .then(response => response.values);
    return asFuture(p);
  } else {
    return checkExists(window.SERVER_SIDE_RENDER).requestDataBatch(keys);
  }
}

export function initialData(): Array<[key: DataKey, value: ServerResponse]> {
  return window.INITIAL_DATA ?? [];
}

export function getLanguage(): string {
  let language;
  if (process.env.CORGI_FOR_BROWSER) {
    language = window.navigator?.language;
  } else {
    language = checkExists(window.SERVER_SIDE_RENDER).language();
  }
  return language ?? 'unknown';
}

export function redirectTo(url: string): void {
  if (process.env.CORGI_FOR_BROWSER) {
    fetchGlobalDeps({
      services: {history: HistoryService},
    }).then(deps => {
      deps.services.history.replaceTo(url);
    });
  } else {
    checkExists(window.SERVER_SIDE_RENDER).redirectTo(url);
  }
}

export function setStatusCode(statusCode: number): void {
  if (!process.env.CORGI_FOR_BROWSER) {
    checkExists(window.SERVER_SIDE_RENDER).setStatusCode(statusCode);
  }
}

export function setTitle(title: string): void {
  if (process.env.CORGI_FOR_BROWSER) {
    document.title = title;
  } else {
    checkExists(window.SERVER_SIDE_RENDER).setTitle(title);
  }
}

