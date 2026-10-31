// node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const { resizeQueue } = require('./wanikani-wrap-up.user.js');

const items = (...ids) => ids.map((id) => ({ id }));
const ids = (list) => list.map((item) => item.id);
const started = (...startedIds) => (item) => startedIds.includes(item.id);
const nothingStarted = () => false;

test('growing pulls from the front of the backlog', () => {
  const r = resizeQueue(items(1, 2), items(3, 4, 5), 4, nothingStarted);
  assert.deepEqual(ids(r.active), [1, 2, 3, 4]);
  assert.deepEqual(ids(r.backlog), [5]);
});

test('growing past everything loaded stops at what is loaded', () => {
  const r = resizeQueue(items(1), items(2), 50, nothingStarted);
  assert.deepEqual(ids(r.active), [1, 2]);
  assert.deepEqual(ids(r.backlog), []);
});

test('shrinking returns items to the front of the backlog, in order', () => {
  const r = resizeQueue(items(1, 2, 3, 4), items(5), 2, nothingStarted);
  assert.deepEqual(ids(r.active), [1, 2]);
  assert.deepEqual(ids(r.backlog), [3, 4, 5]);
});

test('shrinking keeps the head, because updateQueues always removes index 0', () => {
  const r = resizeQueue(items(1, 2, 3), [], 1, started(3));
  assert.equal(r.active[0].id, 1);
});

test('shrinking prefers half-answered items over untouched ones', () => {
  const r = resizeQueue(items(1, 2, 3, 4), [], 2, started(4));
  assert.deepEqual(ids(r.active), [1, 4]);
  assert.deepEqual(ids(r.backlog), [2, 3]);
});

test('half-answered items outrank the requested size', () => {
  const r = resizeQueue(items(1, 2, 3, 4), [], 2, started(2, 3, 4));
  assert.deepEqual(ids(r.active), [1, 2, 3, 4]);
});

test('the requested size is never below one', () => {
  const r = resizeQueue(items(1, 2), [], 0, nothingStarted);
  assert.deepEqual(ids(r.active), [1]);
});

test('an unchanged size changes nothing', () => {
  const r = resizeQueue(items(1, 2), items(3), 2, nothingStarted);
  assert.deepEqual(ids(r.active), [1, 2]);
  assert.deepEqual(ids(r.backlog), [3]);
});
