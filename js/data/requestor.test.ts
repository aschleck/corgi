import {StringValueSchema} from '@bufbuild/protobuf/wkt';

import {Future, unsettledFuture} from '../common/futures';
import {DataKey} from '../server/ssr_aware';

import {DataRequestor} from './requestor';

// The requestor only reads the schemas, so there's no service to describe.
const BACKENDS = {
  'test.Service': {
    service: undefined,
    methods: {
      echo: [StringValueSchema, StringValueSchema],
    },
  },
} as any;

function newRequestor(): {requestData(method: string, request: object): Future<unknown>} {
  return new DataRequestor(BACKENDS) as any;
}

let sent: DataKey[][];

beforeEach(() => {
  sent = [];
  window.SERVER_SIDE_RENDER = {
    requestDataBatch: (keys: DataKey[]) => {
      sent.push(keys);
      return unsettledFuture();
    },
  } as any;
});

afterEach(() => {
  window.INITIAL_DATA = undefined;
  window.SERVER_SIDE_RENDER = undefined;
});

test('an error from the server render rejects the same request without fetching', () => {
  window.INITIAL_DATA = [
    [{method: 'test.Service/Echo', request: 'cow'}, {kind: 'error', code: 404}],
  ];
  const requestor = newRequestor();

  const future = requestor.requestData('test.Service/Echo', {value: 'cow'});

  expect(future.finished).toEqual(true);
  expect(future.ok).toEqual(false);
  expect(sent).toEqual([]);
});

test('an error from the server render only answers once', () => {
  window.INITIAL_DATA = [
    [{method: 'test.Service/Echo', request: 'cow'}, {kind: 'error', code: 404}],
  ];
  const requestor = newRequestor();

  requestor.requestData('test.Service/Echo', {value: 'cow'});
  const retry = requestor.requestData('test.Service/Echo', {value: 'cow'});

  expect(retry.finished).toEqual(false);
  expect(sent).toEqual([[{method: 'test.Service/Echo', request: 'cow'}]]);
});

test('an error from the server render leaves other requests alone', () => {
  window.INITIAL_DATA = [
    [{method: 'test.Service/Echo', request: 'cow'}, {kind: 'error', code: 404}],
  ];
  const requestor = newRequestor();

  const future = requestor.requestData('test.Service/Echo', {value: 'moo'});

  expect(future.finished).toEqual(false);
  expect(sent).toEqual([[{method: 'test.Service/Echo', request: 'moo'}]]);
});
