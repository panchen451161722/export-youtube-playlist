import { serverFetch } from 'nitro/app';
import { defineTask } from 'nitro/task';

import { jobConfiguration } from '../../src/lib/playlist-guard/job-config';

export default defineTask({
  meta: {
    name: 'playlist-guard',
    description: 'Check due collections and deliver queued notifications',
  },
  async run({ context }) {
    const bindings = (
      context as typeof context & {
        cloudflare?: { env?: Record<string, unknown> };
      }
    ).cloudflare?.env;
    const config = jobConfiguration(bindings);
    if (!config.enabled) return { result: { disabled: true } };
    // Local dispatch into the authenticated runner; no public self-fetch or exposed token.
    const response = await serverFetch('/api/playlist-guard-run', {
      method: 'POST',
      headers: { authorization: `Bearer ${config.secret}` },
    });
    if (!response.ok)
      throw new Error(`Playlist monitoring runner failed (${response.status})`);
    const result = await response.json();
    console.info('playlist_guard_scheduled_run', JSON.stringify(result.data));
    return { result: result.data };
  },
});
