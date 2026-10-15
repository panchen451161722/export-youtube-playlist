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
  youtubeCallbackFailure,
} from '../-youtube-connections';

async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  let returnTo = '/settings/collections',
    result = 'session_missing';
  let stage = 'session';
  try {
    const origin = callbackOrigin(request),
      configs = await getAllConfigs();
    const session = await getAuth(configs).api.getSession({
      headers: request.headers,
    });
    if (session?.user) {
      stage = 'state';
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
        result = 'failed';
        const code = url.searchParams.get('code');
        if (code && code.length < 4096) {
          stage = 'exchange_and_save';
          await finishYoutubeAuthorization(state, code, youtubeConfig(configs));
          result = 'connected';
        }
      }
    }
  } catch (error) {
    result = youtubeCallbackFailure(error);
    // Static stage/code only: no URLs, cookies, upstream bodies or credentials.
    console.warn('youtube_authorization_failed', { stage, code: result });
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
