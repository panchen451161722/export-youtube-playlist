import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import {
  disconnectYoutubeConnection,
  listYoutubeConnections,
  startYoutubeAuthorization,
  youtubeConfig,
} from '@/modules/youtube-connections/service';
import { respData, respErr } from '@/lib/resp';
import { YoutubeAccountError } from '@/lib/youtube-connections/google';
import { YOUTUBE_RETURN_PATHS } from '@/lib/youtube-connections/types';

import {
  callbackOrigin,
  readConnectionBody,
  stateCookie,
  youtubeErrorResponse,
} from '../-youtube-connections';

async function GET({ request }: { request: Request }) {
  try {
    const configs = await getAllConfigs();
    const session = await getAuth(configs).api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    return respData(
      {
        accounts: await listYoutubeConnections(session.user.id),
        configured: !!youtubeConfig(configs),
      },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch (error) {
    return youtubeErrorResponse(error);
  }
}
async function POST({ request }: { request: Request }) {
  try {
    const origin = callbackOrigin(request);
    if (
      request.headers.get('origin') !== origin ||
      request.headers.get('sec-fetch-site') === 'cross-site' ||
      !request.headers.get('content-type')?.startsWith('application/json')
    )
      throw new YoutubeAccountError(
        'invalid_origin',
        'This request must come from this website.',
        403
      );
    const configs = await getAllConfigs(),
      session = await getAuth(configs).api.getSession({
        headers: request.headers,
      });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    // The accepted body contains only IDs and one fixed return path.
    const parsed = z
      .discriminatedUnion('action', [
        z
          .object({
            action: z.literal('connect'),
            returnTo: z.enum(YOUTUBE_RETURN_PATHS),
            reconnectId: z.string().max(100).optional(),
          })
          .strict(),
        z
          .object({
            action: z.literal('disconnect'),
            id: z.string().min(1).max(100),
          })
          .strict(),
      ])
      .safeParse(await readConnectionBody(request));
    if (!parsed.success)
      throw new YoutubeAccountError(
        'invalid_request',
        'Invalid connection request.'
      );
    if (parsed.data.action === 'disconnect') {
      await disconnectYoutubeConnection(session.user.id, parsed.data.id);
      return respData(
        { disconnected: true },
        { headers: { 'cache-control': 'no-store' } }
      );
    }
    const result = await startYoutubeAuthorization(
      {
        userId: session.user.id,
        sessionId: session.session.id,
        returnTo: parsed.data.returnTo,
        reconnectId: parsed.data.reconnectId,
        redirectUri: origin + '/api/youtube-connections/callback',
      },
      youtubeConfig(configs)
    );
    return respData(
      { url: result.url },
      {
        headers: {
          'cache-control': 'no-store',
          'set-cookie': stateCookie(result.cookie, origin.startsWith('https:')),
        },
      }
    );
  } catch (error) {
    return youtubeErrorResponse(error);
  }
}
export const Route = createFileRoute('/api/youtube-connections/')({
  server: { handlers: { GET, POST } },
});
