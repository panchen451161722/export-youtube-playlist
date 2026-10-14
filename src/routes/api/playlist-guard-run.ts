import { createFileRoute } from '@tanstack/react-router';

import { createGuardStore } from '@/modules/playlist-guard/service';
import { respData, respErr } from '@/lib/resp';

import {
  guardErrorResponse,
  guardRuntime,
  jobConfiguration,
} from './-playlist-guard';
import { runGuardJobs } from './-playlist-guard-jobs';

async function equalSecret(actual: string, expected: string) {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(actual)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
async function POST({ request }: { request: Request }) {
  const config = jobConfiguration();
  if (!config.enabled)
    return respErr('Scheduled monitoring is not enabled.', { status: 503 });
  const authorization = request.headers.get('authorization') || '';
  if (
    authorization.length > 1024 ||
    !authorization.startsWith('Bearer ') ||
    !(await equalSecret(authorization.slice(7), config.secret))
  )
    return respErr('Unauthorized', { status: 401 });
  try {
    const store = createGuardStore();
    const runtime = await guardRuntime();
    return respData(await runGuardJobs(store, runtime), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return guardErrorResponse(error);
  }
}
export const Route = createFileRoute('/api/playlist-guard-run')({
  server: { handlers: { POST } },
});
