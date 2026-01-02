import {Message} from '@bufbuild/protobuf';

import {Future, resolvedFuture} from '../common/futures';

import {getCache, putCache} from './caching';

interface Result<V> {
  kind: 'result';
  value: V;
}

interface Error {
  kind: 'error';
  code: number;
}

export type Response<V> = Result<V> | Error;

export interface Middleware {
  onRequest?(method: string, request: Message):
    | {
      action: 'continue';
      request: Message;
    }
    | {
      action: 'return';
      response: Response<Message>;
    };

  onResponse?(method: string, request: Message, response: Response<Message>):
    Future<Response<Message>>;
}

export class CachingMiddleware implements Middleware {

  onRequest(method: string, request: Message) {
    const cached = getCache(method, request);
    if (cached) {
      return {
        action: 'return',
        response: {
          kind: 'result',
          value: cached,
        },
      } as const;
    } else {
      return {action: 'continue', request} as const;
    }
  }

  onResponse(method: string, request: Message, response: Response<Message>) {
    if (response.kind === 'result') {
      putCache(method, request, response.value);
    }
    return resolvedFuture(response);
  }
}
