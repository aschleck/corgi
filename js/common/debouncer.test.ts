import {Debouncer} from './debouncer';

test('callback fires once after delay', async () => {
  let count = 0;
  const d = new Debouncer(0, () => { count += 1; });
  await d.trigger();
  expect(count).toEqual(1);
});

test('multiple triggers coalesce to one callback', async () => {
  let count = 0;
  const d = new Debouncer(0, () => { count += 1; });
  d.trigger();
  d.trigger();
  await d.trigger();
  expect(count).toEqual(1);
});

test('every awaiting trigger resolves when the eventual flush fires', async () => {
  let count = 0;
  const d = new Debouncer(0, () => { count += 1; });
  const p1 = d.trigger();
  const p2 = d.trigger();
  const p3 = d.trigger();
  await Promise.all([p1, p2, p3]);
  expect(count).toEqual(1);
});

test('trigger after flush starts a fresh window', async () => {
  let count = 0;
  const d = new Debouncer(0, () => { count += 1; });
  await d.trigger();
  expect(count).toEqual(1);
  await d.trigger();
  expect(count).toEqual(2);
});

test('callback throw rejects every awaiter on the shared promise', async () => {
  const d = new Debouncer(0, () => { throw new Error('boom'); });
  const p1 = d.trigger();
  const p2 = d.trigger();
  await expect(p1).rejects.toThrow('boom');
  await expect(p2).rejects.toThrow('boom');
});
