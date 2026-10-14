export function jobConfiguration(bindings?: Record<string, unknown>) {
  const global = globalThis as typeof globalThis & {
    __CF_ENV__?: Record<string, unknown>;
    __env__?: Record<string, unknown>;
  };
  const env = bindings ?? global.__CF_ENV__ ?? global.__env__;
  const secret = String(
    env?.PLAYLIST_GUARD_JOB_SECRET ??
      process.env.PLAYLIST_GUARD_JOB_SECRET ??
      ''
  );
  return {
    secret,
    enabled:
      secret.length >= 32 &&
      String(
        env?.PLAYLIST_GUARD_SCHEDULER_ENABLED ??
          process.env.PLAYLIST_GUARD_SCHEDULER_ENABLED
      ) === 'true',
  };
}
