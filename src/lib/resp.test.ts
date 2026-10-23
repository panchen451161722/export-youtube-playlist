import assert from 'node:assert/strict';
import { test } from 'node:test';

import { respData, respErr, respOk, respPage } from './resp';

test('an absent optional record remains null in a successful API response', async () => {
  assert.deepEqual(await respData(null).json(), {
    code: 0,
    message: 'ok',
    data: null,
  });
});

test('success responses preserve collections, falsey values and response options', async () => {
  for (const data of [[], { items: [], total: 0 }, 0, false, '']) {
    const response = respData(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
    assert.deepEqual((await response.json()).data, data);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
  assert.deepEqual((await respData(undefined).json()).data, []);
  assert.deepEqual(await respPage([], 0).json(), {
    code: 0,
    message: 'ok',
    data: { items: [], total: 0 },
  });
  assert.deepEqual(await respOk().json(), { code: 0, message: 'ok' });
  assert.deepEqual(await respErr('Unauthorized', { status: 401 }).json(), {
    code: -1,
    message: 'Unauthorized',
  });
});
