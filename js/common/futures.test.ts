import {asFuture} from './futures';

test('asFuture on resolved promise knows the value', async () => {
  const promise = Promise.resolve('cow');
  const future = asFuture(promise);
  expect(future.finished).toEqual(false);
  await promise.then(() => {});
  expect(future.finished).toEqual(true);
  expect(future.ok).toEqual(true);
  expect(() => future.error()).toThrow();
  expect(future.value()).toEqual('cow');
});

test('asFuture on resolved promise chains without extra waiting', async () => {
  const promise = Promise.resolve('cow');
  const future = asFuture(promise);
  expect(future.finished).toEqual(false);
  await promise.then(() => {});
  const future2 = future.then(s => s + s);
  expect(future2.finished).toEqual(true);
  expect(future2.ok).toEqual(true);
  expect(() => future2.error()).toThrow();
  expect(future2.value()).toEqual('cowcow');
});

test('asFuture on resolved promise chains a promise', async () => {
  const promise = Promise.resolve('cow');
  const future = asFuture(promise);
  expect(future.finished).toEqual(false);
  await promise.then(() => {});
  const future2 = future.then(s => Promise.resolve(s + s));
  expect(future2.finished).toEqual(false);
  await future2;
  expect(future2.finished).toEqual(true);
  expect(future2.ok).toEqual(true);
  expect(() => future2.error()).toThrow();
  expect(future2.value()).toEqual('cowcow');
});

test('asFuture on rejected promise knows failure', async () => {
  const promise = Promise.reject('noo');
  const future = asFuture(promise);
  expect(future.finished).toEqual(false);
  await promise.catch(() => {}); // wait for the first promise to resolve
  expect(future.finished).toEqual(true);
  expect(future.ok).toEqual(false);
  expect(future.error()).toEqual('noo');
  expect(() => future.value()).toThrow();
});

test('asFuture on rejected promise can be saved with value', async () => {
  const promise = Promise.reject('noo');
  const future = asFuture(promise);
  expect(future.finished).toEqual(false);
  await promise.catch(() => {});
  const future2 = future.catch(() => 27);
  expect(future2.finished).toEqual(true);
  expect(future2.ok).toEqual(true);
  expect(() => future2.error()).toThrow();
  expect(future2.value()).toEqual(27);
});

test('asFuture ignores uncaught results', async () => {
  asFuture(Promise.reject('noo'));
  await Promise.resolve().then(() => {});
});

