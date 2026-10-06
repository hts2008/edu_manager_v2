import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRouterHandler} from '../api/router.js';
import {createTestRequest, createTestResponse} from '../lib/request-response-adapter.js';

test('release maintenance refuses reads, writes and cron before loading DB handlers', async () => {
  const previous = process.env.RELEASE_MAINTENANCE;
  process.env.RELEASE_MAINTENANCE = 'true';
  try {
    for (const [method, path] of [['GET','cron/monthly-fees'], ['POST','auth/login'], ['PATCH','students/x']]) {
      let resolved = false;
      const handler = createRouterHandler({resolve: () => {resolved = true; return null;}});
      const response = createTestResponse();
      await handler(createTestRequest({method, query:{path}}), response.res);
      assert.equal(response.state.statusCode, 503);
      assert.equal(resolved, false);
    }
  } finally {
    if (previous === undefined) delete process.env.RELEASE_MAINTENANCE;
    else process.env.RELEASE_MAINTENANCE = previous;
  }
});
