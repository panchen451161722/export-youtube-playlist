import { serverFetch } from 'nitro/app';
import { defineTask } from 'nitro/task';

import { jobConfiguration } from '../../src/lib/playlist-guard/job-config';
import { retryGuestCheckouts } from '../../src/routes/api/payment/-guest-checkout';
import { runYoutubeMaintenance } from '../utils/youtube-maintenance';

export default defineTask({
  meta: {
    name: 'playlist-guard',
    description:
      'Clean YouTube data, verify grants, and run enabled collection monitoring',
  },
  async run({ context }) {
    const maintenance = await runYoutubeMaintenance();
    const guestCheckouts = await retryGuestCheckouts();
    if (guestCheckouts.failed)
      console.error('guest_checkout_retry_failed', guestCheckouts.failed);
    console.info('youtube_privacy_maintenance', JSON.stringify(maintenance));
    const bindings = (
      context as typeof context & {
        cloudflare?: { env?: Record<string, unknown> };
      }
    ).cloudflare?.env;
    const config = jobConfiguration(bindings);
    if (!config.enabled) {
      if (maintenance.failed.length)
        throw new Error(
          `YouTube maintenance failed: ${maintenance.failed.join(', ')}`
        );
      return {
        result: { monitoringDisabled: true, maintenance: maintenance.results },
      };
    }
    // Local dispatch into the authenticated runner; no public self-fetch or exposed token.
    const response = await serverFetch('/api/playlist-guard-run', {
      method: 'POST',
      headers: { authorization: `Bearer ${config.secret}` },
    });
    if (!response.ok)
      throw new Error(`Playlist monitoring runner failed (${response.status})`);
    const result = await response.json();
    console.info('playlist_guard_scheduled_run', JSON.stringify(result.data));
    if (maintenance.failed.length)
      throw new Error(
        `YouTube maintenance failed: ${maintenance.failed.join(', ')}`
      );
    return { result: { ...result.data, maintenance: maintenance.results } };
  },
});
