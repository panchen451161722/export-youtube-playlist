import {
  GuardError,
  type createGuardStore,
} from '@/modules/playlist-guard/service';

import type { guardRuntime } from './-playlist-guard';

export async function runGuardJobs(
  store: ReturnType<typeof createGuardStore>,
  runtime: Pick<
    Awaited<ReturnType<typeof guardRuntime>>,
    'scan' | 'send' | 'capabilities'
  >
) {
  const due =
    runtime.capabilities.youtube || runtime.capabilities.privateSources
      ? await store.due(5)
      : [];
  let completed = 0;
  let failed = 0;
  for (const collection of due) {
    try {
      await store.sync(collection.userId, collection.id, runtime.scan, {
        scheduled: true,
        emailAvailable: runtime.capabilities.email,
      });
      completed++;
    } catch (error) {
      failed++;
      if (error instanceof GuardError && error.code === 'plan_required')
        await store.defer(collection.userId, collection.id);
    }
  }
  // Mail retries are independent from scans, including when YouTube is unavailable.
  // Await mail setup without creating stale alerts or exhausting pending delivery retries.
  const mail = runtime.capabilities.email
    ? await store.deliverPending(runtime.send)
    : { attempted: 0, sent: 0, failed: 0, cancelled: 0 };
  return { checked: due.length, completed, failed, mail };
}
