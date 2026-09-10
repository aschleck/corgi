import { waitMs } from './promises';
import { Timer } from './timer';

test('callback repeats on the delay', async () => {
  let count = 0;
  const t = new Timer(1, () => { count += 1; });
  t.start();
  await waitMs(30);
  t.stop();
  expect(count).toBeGreaterThan(1);
});

test('an async callback never overlaps itself', async () => {
  let running = 0;
  let overlapped = false;
  const t = new Timer(1, async () => {
    running += 1;
    overlapped ||= running > 1;
    await waitMs(10);
    running -= 1;
  });
  t.start();
  await waitMs(50);
  t.stop();
  expect(overlapped).toEqual(false);
});

test('a slow async callback delays the next run rather than queueing', async () => {
  let count = 0;
  const t = new Timer(1, async () => {
    count += 1;
    await waitMs(20);
  });
  t.start();
  await waitMs(50);
  t.stop();
  // Without awaiting the callback this would fire about every millisecond.
  expect(count).toBeLessThan(5);
});

test('a rejected callback keeps the timer running', async () => {
  let count = 0;
  let logged = 0;
  const original = console.error;
  console.error = () => { logged += 1; };
  const t = new Timer(1, async () => {
    count += 1;
    throw new Error('boom');
  });
  t.start();
  await waitMs(30);
  t.stop();
  console.error = original;
  expect(count).toBeGreaterThan(1);
  expect(logged).toEqual(count);
});

test('stop during an async callback stops the timer', async () => {
  let count = 0;
  const t = new Timer(1, async () => {
    count += 1;
    t.stop();
    await waitMs(10);
  });
  t.start();
  await waitMs(50);
  expect(count).toEqual(1);
});

test('dispose during an async callback stops the timer', async () => {
  let count = 0;
  const t = new Timer(1, async () => {
    count += 1;
    t.dispose();
    await waitMs(10);
  });
  t.start();
  await waitMs(50);
  expect(count).toEqual(1);
});
