import {
  DescMessage,
  DescService,
  Message,
  MessageInitShape,
  MessageShape,
  create as protoCreate,
  fromJson as protoFromJson,
  toJson as protoToJson,
} from '@bufbuild/protobuf';

import {checkExhaustive} from '../common/asserts';
import {Future, asFuture, resolvedFuture} from '../common/futures';
import {requestDataBatch as ssrRequestDataBatch, ServerResponse, initialData} from '../server/ssr_aware';

import {putCache} from './caching';
import {Middleware, Response} from './middleware';

// First we want to get the type of a BACKENDS object
interface RpcCall<I, O> {
  methodKind: string;
  input: I;
  output: O;
}
type UnaryRequestResponse<C extends RpcCall<unknown, unknown>> =
  C['methodKind'] extends 'unary'
    ? C extends RpcCall<infer I, infer O>
      ? readonly [I, O]
      : never
    :never;
type AllMethods<S extends DescService> =
  {[M in keyof S['method']]: UnaryRequestResponse<S['method'][M]>};
type Backends<N extends string, S extends DescService> = {
  readonly [K in N]: {
    service: S;
    methods: Partial<AllMethods<S>>;
  }
};

// Now we want to flatten backends into a big object of fully qualified methods. I have actually no
// idea how UnionToIntersection works but it's beautiful.
type MaybeIO<IO> = IO extends readonly [infer I, infer O] ? [I, O] : never;
type FqBackends<B> =
  B extends Backends<any, any>
    ? {
      [S in keyof B]: {
        [K in keyof B[S]['methods'] as `${string & S}/${Capitalize<string & K>}`]:
          MaybeIO<B[S]['methods'][K]>
      }
    }
    : never;
type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void
    ? I
    : never;
export type FqMethods<B> = UnionToIntersection<FqBackends<B>[keyof FqBackends<B>]>;

// Since these types are war crimes we need utilities to get stuff out of them
type GetRequest<T> =
  T extends readonly [infer I extends DescMessage, any] ? MessageInitShape<I> : never;
type GetResponse<T> =
  T extends readonly [any, infer O extends DescMessage] ? MessageShape<O> : never;

interface Request<B> {
  method: keyof FqMethods<B> & string;
  request: Message;
};

type RawBackends = {
  [S: string]: {
    methods: {
      [M: string]: readonly [DescMessage, DescMessage]
    };
  }
};

export class DataRequestor<B extends RawBackends> {

  private readonly middleware: Middleware[];
  private readonly types: FqMethods<B>;
  private requestFuture: Future<ServerResponse[]> | undefined;
  private requestQueue: Array<Request<B>> | undefined;

  constructor(backends: B) {
    this.middleware = [];
    this.types = Object.fromEntries(
      Object.entries(backends).flatMap(([typeName, {methods}]) =>
        Object.entries(methods).map(([method, io]) => [
          `${typeName}/${method.charAt(0).toUpperCase() + method.slice(1)}`,
          io,
        ])
      )
    ) as typeof this.types;

    for (const [{method, request}, response] of initialData()) {
      const type = this.getType(method as keyof FqMethods<B>);
      if (response.kind === 'result') {
        putCache(
          method,
          protoFromJson(type.request, request),
          protoFromJson(type.response, response.value));
      }
    }
  }

  addMiddleware(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  requestData<
    K extends keyof FqMethods<B> & string,
    Req extends GetRequest<FqMethods<B>[K]>,
    Resp extends GetResponse<FqMethods<B>[K]>,
  >(method: K, request: Req): Future<Resp> {
    const schema = this.getType(method).request;
    let munged = protoCreate(schema, request);
    const munges = Array(this.middleware.length);
    for (let i = this.middleware.length - 1; i >= 0; --i) {
      const actor = this.middleware[i];
      if (!actor.onRequest) {
        munges[i] = munged;
        continue;
      }

      const decision = actor.onRequest(method, munged);
      if (decision.action === 'continue') {
        munged = decision.request;
        munges[i] = munged;
      } else if (decision.action === 'return') {
        if (decision.response.kind === 'result') {
          return resolvedFuture(decision.response.value as Resp);
        } else if (decision.response.kind === 'error') {
          throw new Error(`Request terminated in middleware with code ${decision.response.code}`);
        } else {
          throw checkExhaustive(decision.response);
        }
      } else {
        throw checkExhaustive(decision);
      }
    }

    const processResponse = (response: Response<Message>) => {
      let munged = resolvedFuture(response);
      for (let i = 0; i < this.middleware.length; ++i) {
        const sawRequest = munges[i];
        const actor = this.middleware[i];
        munged = munged.then(r => {
          if (actor.onResponse) {
            return actor.onResponse(method, sawRequest, r);
          } else {
            return r;
          }
        });
      }
      return munged.then(r => {
        if (r.kind === 'result') {
          return r.value as Resp;
        } else if (r.kind === 'error') {
          throw new Error(`Response failed with code ${r.code}`);
        } else {
          throw checkExhaustive(r);
        }
      });
    }

    // We usually wait a tick to gather multiple keys before making the request. But if we're
    // rendering on the server we really just want to send it out now. Yolo.
    if (!process.env.CORGI_FOR_BROWSER) {
      return this.makeDataRequest([{method, request: munged}])
        .then(responses => processResponse(this.unwrap(method, responses[0])));
    }

    return this.enqueueDataRequest(method, munged).then(processResponse);
  }

  private enqueueDataRequest<
    K extends keyof FqMethods<B> & string,
  >(method: K, request: Message): Future<Response<Message>> {
    if (!this.requestFuture || !this.requestQueue) {
      this.requestQueue = [];
      const captured = this.requestQueue;
      // We intentionally wait a tick here - we want to gather multiple keys before sending the
      // request
      this.requestFuture = asFuture(Promise.resolve()).then(() => {
        this.requestFuture = undefined;
        this.requestQueue = undefined;
        return this.makeDataRequest(captured);
      });
    }

    const i = this.requestQueue.length;
    this.requestQueue.push({method, request});
    return this.requestFuture.then(responses => this.unwrap(method, responses[i]));
  }

  private makeDataRequest(requests: Array<Request<B>>): Future<ServerResponse[]> {
    const toJson =
      requests.map(
        ({method, request}) => ({
          method,
          request: protoToJson(this.getType(method).request, request),
        }));
    return ssrRequestDataBatch(toJson);
  }

  private getType<K extends keyof FqMethods<B>>(method: K):
    {request: DescMessage; response: DescMessage} {
    // TODO(april): why is this cast required?
    const [request, response] = this.types[method] as [DescMessage, DescMessage];
    return {request, response};
  }

  private unwrap<
    K extends keyof FqMethods<B> & string,
    R extends GetResponse<FqMethods<B>[K]>
  >(method: K, result: ServerResponse): Response<R> {
    if (result.kind === 'result') {
      const schema = this.getType(method).response;
      return {
        kind: 'result',
        value: protoFromJson(schema, result.value) as R,
      };
    } else {
      return result;
    }
  }
}

