// The Workers env is a deployment binding, not per-request user state. Both
// fetch and scheduled tasks must initialize it before synchronous db() calls.
const CF_WORKERS_MODULE = 'cloudflare:workers';
let initialization: Promise<void> | undefined;

export function ensureCloudflareEnv(): Promise<void> {
  initialization ??= import(/* @vite-ignore */ CF_WORKERS_MODULE)
    .then((mod) => {
      (
        globalThis as typeof globalThis & {
          __CF_ENV__?: Record<string, unknown>;
        }
      ).__CF_ENV__ = mod.env;
    })
    .catch(() => {
      // Node development/test builds do not expose Cloudflare bindings.
    });
  return initialization;
}
