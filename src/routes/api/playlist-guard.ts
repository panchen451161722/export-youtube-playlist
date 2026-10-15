import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import { createGuardStore, GuardError } from '@/modules/playlist-guard/service';
import {
  ownedYoutubeConnection,
  youtubeAccessToken,
  youtubeConfig,
} from '@/modules/youtube-connections/service';
import { needsYoutubeAccount } from '@/lib/playlist-guard/types';
import { respData, respErr } from '@/lib/resp';

import {
  assertGuardBackupEmailReady,
  guardErrorResponse,
  guardRuntime,
  normalizeGuardSource,
  readGuardAction,
} from './-playlist-guard';

async function GET({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user)
      return respErr('Unauthorized', {
        status: 401,
        headers: { 'cache-control': 'no-store' },
      });
    const store = createGuardStore();
    const id = new URL(request.url).searchParams.get('id');
    if (id)
      return respData(await store.detail(session.user.id, id), {
        headers: { 'cache-control': 'no-store' },
      });
    const [{ capabilities }, collections, entitlement] = await Promise.all([
      guardRuntime(),
      store.list(session.user.id),
      store.entitlement(session.user.id),
    ]);
    return respData(
      { collections, entitlement, capabilities },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch (error) {
    return guardErrorResponse(error);
  }
}

async function POST({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user)
      return respErr('Unauthorized', {
        status: 401,
        headers: { 'cache-control': 'no-store' },
      });
    const action = await readGuardAction(request);
    const store = createGuardStore();
    const userId = session.user.id;
    let result: unknown;
    if (action.action === 'start_trial')
      result = await store.startTrial(userId);
    else if (action.action === 'delete')
      result = await store.remove(userId, action.id);
    else {
      const runtime = await guardRuntime();
      assertGuardBackupEmailReady(
        action,
        runtime.capabilities.email,
        session.user.emailVerified
      );
      if (action.action === 'update') {
        const { action: _action, id, ...patch } = action;
        result = await store.update(userId, id, patch);
      } else if (action.action === 'create') {
        if (needsYoutubeAccount(action.source)) {
          if (!action.connectionId)
            throw new GuardError(
              'account_required',
              'Connect and select a YouTube account.',
              400
            );
          await ownedYoutubeConnection(userId, action.connectionId);
          await youtubeAccessToken(
            userId,
            action.connectionId,
            youtubeConfig(await getAllConfigs())
          );
        } else if (!runtime.capabilities.youtube)
          throw new GuardError(
            'youtube_unconfigured',
            'YouTube monitoring is not configured yet.',
            503
          );
        const { action: _action, ...input } = action;
        const normalized = normalizeGuardSource(input);
        const collection = await store.create(
          userId,
          normalized.input,
          normalized.key
        );
        // Keep the newly reserved collection visible if YouTube fails, allowing a retry or removal.
        try {
          result = await store.sync(userId, collection.id, runtime.scan);
        } catch {
          result = await store.detail(userId, collection.id);
        }
      } else {
        const collection = await store.sync(userId, action.id, runtime.scan);
        result = collection;
      }
    }
    return respData(result, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return guardErrorResponse(error);
  }
}

export const Route = createFileRoute('/api/playlist-guard')({
  server: { handlers: { GET, POST } },
});
