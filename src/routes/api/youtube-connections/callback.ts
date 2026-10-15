import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import {
  finishYoutubeAuthorization,
  readYoutubeAuthorizationState,
  youtubeConfig,
} from '@/modules/youtube-connections/service';

import {
  callbackOrigin,
  readStateCookie,
  stateCookie,
} from '../-youtube-connections';

async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  let returnTo = '/settings/collections',
    result = 'failed';
  try {
    const origin = callbackOrigin(request),
      configs = await getAllConfigs();
    const session = await getAuth(configs).api.getSession({
      headers: request.headers,
    });
    if (session?.user) {
      const state = await readYoutubeAuthorizationState(
        readStateCookie(request),
        url.searchParams.get('state') || '',
        session.user.id,
        session.session.id,
        origin
      );
      returnTo = state.returnTo;
      if (url.searchParams.get('error')) result = 'denied';
      else {
        const code = url.searchParams.get('code');
        if (code && code.length < 4096) {
          await finishYoutubeAuthorization(state, code, youtubeConfig(configs));
          result = 'connected';
        }
      }
    }
  } catch {
    /* Do not leak upstream responses, tokens or authorization codes. */
  }
  return new Response(null, {
    status: 303,
    headers: {
      location: returnTo + '?youtube=' + result,
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'set-cookie': stateCookie('', url.protocol === 'https:'),
    },
  });
}
export const Route = createFileRoute('/api/youtube-connections/callback')({
  server: { handlers: { GET } },
});
