import { and, eq, isNull } from 'drizzle-orm';

import { config } from '../../src/config/db/schema';
import { ensureCloudflareEnv } from '../../src/core/cloudflare-env';
import { db } from '../../src/core/db';
import { drainYoutubeRevocations } from '../../src/core/youtube-lifecycle/service';
import { runPrivacyMaintenance } from '../../src/lib/youtube-maintenance';
import { getAllConfigs } from '../../src/modules/config/service';
import {
  createGuardStore,
  type GuardCleanupCursor,
} from '../../src/modules/playlist-guard/service';
import {
  validateYoutubeConnections,
  youtubeConfig,
} from '../../src/modules/youtube-connections/service';

const CURSOR_KEY = 'youtube_retention_cursor';

function parseCursor(
  value: string | null | undefined
): GuardCleanupCursor | undefined {
  if (!value) return undefined;
  try {
    const cursor = JSON.parse(value);
    if (
      cursor &&
      ['collectionId', 'deliveryId'].every(
        (key) => cursor[key] === null || typeof cursor[key] === 'string'
      )
    ) {
      return cursor;
    }
  } catch {
    /* Corrupt or legacy state restarts a complete sweep. */
  }
  return undefined;
}

/** Runs regardless of the product's paid-plan scheduler or email settings. */
export async function runYoutubeMaintenance() {
  await ensureCloudflareEnv();
  const database = db();
  return runPrivacyMaintenance({
    validate: async () =>
      validateYoutubeConnections(youtubeConfig(await getAllConfigs()), {
        database,
      }),
    revoke: async () => drainYoutubeRevocations({ database }),
    cleanup: async () => {
      const [previous] = await database
        .select()
        .from(config)
        .where(eq(config.name, CURSOR_KEY))
        .limit(1);
      const result = await createGuardStore(database).cleanupExpired({
        cursor: parseCursor(previous?.value),
      });
      const value = JSON.stringify(result.nextCursor);
      if (previous) {
        // A concurrent older worker may repeat a page, but cannot rewind the
        // cursor saved by a newer run. Each stream reaches its own end.
        await database
          .update(config)
          .set({ value })
          .where(
            and(
              eq(config.name, CURSOR_KEY),
              previous.value === null
                ? isNull(config.value)
                : eq(config.value, previous.value)
            )
          );
      } else {
        await database
          .insert(config)
          .values({ name: CURSOR_KEY, value })
          .onConflictDoUpdate({
            target: config.name,
            set: { name: CURSOR_KEY },
          });
      }
      const { nextCursor, ...counts } = result;
      return { ...counts, sweepComplete: nextCursor === null };
    },
  });
}
