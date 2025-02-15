import crypto from 'crypto';
import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { fastifyRequestContextPlugin, requestContext } from '@fastify/request-context';

import { checkExists } from '../common/asserts';
import { deepEqual } from '../common/comparisons';
import { Future, resolvedFuture, unsettledFuture } from '../common/futures';
import { Properties, VElementOrPrimitive, vdomCaching } from '../corgi';
import { ElementFactory, FRAGMENT_MARKER, canonicalize } from '../corgi/vdom';

import { DataKey } from './ssr_aware';

declare module '@fastify/request-context' {
  interface RequestContextData {
    cookies: string|undefined;
    requestDataBatch: (keys: DataKey[]) => Future<object[]>;
    language: string|undefined;
    redirectTo: string;
    title: string;
    url: string;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

global.window = {
  SERVER_SIDE_RENDER: {
    cookies: function() {
      return requestContext.get('cookies');
    },
    currentUrl: function() {
      return requestContext.get('url');
    },
    requestDataBatch: (keys: DataKey[]) => {
      return checkExists(requestContext.get('requestDataBatch'))(keys);
    },
    language: function() {
      return requestContext.get('language');
    },
    redirectTo: function(url: string) {
      requestContext.set('redirectTo', url);
    },
    setTitle: function(title: string) {
      requestContext.set('title', title);
    },
  },
  devicePixelRation: 1,
  location: {
    search: 'hardcoded-do-not-use',
  },
} as any;

type PageFn = (content: string, title: string, escapedData: string) => string;

vdomCaching.disable();

export async function serve(
        app: ElementFactory,
        page: PageFn,
        {dataServer, defaultTitle, initialize, host, port}: {
          dataServer?: string;
          defaultTitle: string;
          initialize?: (f: FastifyInstance) => Promise<void>,
          host?: string;
          port: number;
        }):
    Promise<void> {
  const server = fastify({
    logger: true,
  });

  server.register(fastifyRequestContextPlugin);
  server.decorateRequest('userId', '');

  if (initialize) {
    await initialize(server);
  }

  server.get('/*', async (request: FastifyRequest, reply: FastifyReply) => {
    requestContext.set('cookies', request.headers['cookie']);
    requestContext.set(
        'language',
        (request.headers['accept-language'] ?? 'en-US')
            .split(';')[0]
            .split(',')[0]);
    requestContext.set('url', `https://trailcatalog.org${request.url}`);

    const requestedData: Array<[DataKey, object]> = [];
    const missingData: DataKey[] = [];
    requestContext.set('requestDataBatch', (keys: DataKey[]) => {
      const values = [];
      for (const key of keys) {
        let found = false;
        for (const [candidate, value] of requestedData) {
          if (deepEqual(key, candidate)) {
            found = true;
            values.push(value);
            break;
          }
        }

        if (!found) {
          missingData.push(key);
        }
      }

      if (keys.length === values.length) {
        return resolvedFuture(values);
      } else {
        return unsettledFuture();
      }
    });

    // We re-run the render over and over again until new data stops being fetched. At least we cap
    // it to 10 renders.
    let renderAttempts = 10;
    for ( ; renderAttempts > 0; renderAttempts--) {
      app({}, undefined, () => {});
      await Promise.resolve(); // wait 1 tick for the fetches to resolve

      if (missingData.length > 0) {
        const host =
            dataServer === 'self'
                ? `${server.listeningOrigin}/api/data`
                : (dataServer ?? 'http://127.0.0.1:7070/api/data');
        const response = await fetch(host, {
            method: 'POST',
            headers: {
              'authorization': request.headers['authorization'] ?? '',
              'content-type': 'application/json',
              'if-none-match': request.headers['if-none-match'] ?? '',
              'x-user-email': (request.headers['x-user-email'] as string | undefined) ?? '',
              'x-user-id': (request.headers['x-user-id'] as string | undefined) ?? '',
            },
            body: JSON.stringify({
              keys: missingData,
            }),
          });

        if (!response.ok) {
          return reply.type('text/plain').code(response.status).send(response.statusText);
        }

        const responseData = (await response.json() as {values: object[]}).values;
        for (let i = 0; i < missingData.length; ++i) {
          requestedData.push([missingData[i], responseData[i]]);
        }
        missingData.length = 0;
      } else {
        break;
      }
    }

    if (renderAttempts === 0) {
      throw new Error('Server-side render did not converge');
    }

    // The last render was good, so just do it again
    const content = app({}, undefined, () => {});

    const redirectUrl = requestContext.get('redirectTo');
    if (redirectUrl) {
      return reply.redirect(encodeURI(redirectUrl), 302);
    }

    const escapedData = JSON.stringify(requestedData).replace(/\//g, '\\/');
    const result =
        page(
            render(content),
            renderText(requestContext.get('title') ?? defaultTitle),
            escapedData);

    const ifNoneMatch = request.headers['if-none-match'];
    const etag = '"' + crypto.createHash('md5').update(result).digest('base64') + '"';
    reply.type('text/html').header('ETag', etag);
    if (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`) {
      reply.code(304);
    } else {
      reply.code(200).send(result);
    }
  });

  server.listen({ host, port }, (err, address) => {
    if (err) {
      throw err;
    }
    console.log(`Running on ${address}`);
  });
}

function render(element: VElementOrPrimitive): string {
  if (element instanceof Object) {
    const properties = renderProperties(element.props);
    const spaceProperties = properties ? ` ${properties}` : '';
    if (element.tag === FRAGMENT_MARKER) {
      const children = element.children.map(render);
      return children.join('');
    } else if (element.children) {
      const children = element.children.map(render);
      return `<${element.tag}${spaceProperties}>${children.join('')}</${element.tag}>`;
    } else {
      return `<${element.tag}${spaceProperties} />`;
    }
  } else {
    return renderText(element);
  }
}

const ESCAPES = {
  '"': '&#34;',
  '&': '&#38;',
  '<': '&#60;',
  '>': '&#62;',
  '\'': '&#39;',
  '`': '&#96;',
} as const;

function renderProperties(props: Properties): string {
  const attributes = [];
  for (const [key, value] of Object.entries(props)) {
    if (key === 'data') {
      for (const [k, v] of Object.entries(value)) {
        attributes.push(...renderAttribute(canonicalize(`data-${k}`), v));
      }
      continue;
    }

    let actualKey;
    let actualValue = value;
    if (key === 'className') {
      actualKey = 'class';
    } else if (key === 'children' || key === 'unboundEvents') {
      continue;
    } else if (key === 'js') {
      attributes.push('data-js');
      if (value.ref) {
        actualKey = 'data-js-ref';
        actualValue = value.ref;
      } else {
        continue;
      }
    } else {
      actualKey = canonicalize(key);
    }

    attributes.push(...renderAttribute(actualKey, actualValue));
  }
  return attributes.join(' ');
}

function renderAttribute(key: string, value: boolean|number|string|undefined|unknown): string[] {
  if (value === undefined) {
    return [];
  }

  let rendered;
  if (typeof value === 'string') {
    rendered = renderText(value);
  } else if (key === 'checked' && typeof value === 'boolean') {
    if (value) {
      return [key];
    } else {
      return [];
    }
  } else {
    rendered = value;
  }

  return [`${key}="${rendered}"`];
}

function renderText(value: number|string): string {
  const escapedValue = [];
  for (const c of String(value)) {
    if (c in ESCAPES) {
      escapedValue.push(ESCAPES[c as keyof typeof ESCAPES]);
    } else {
      escapedValue.push(c);
    }
  }
  return escapedValue.join('');
}
