/** Attempt every privacy task even when another provider or cleanup fails. */
export async function runPrivacyMaintenance(tasks: {
  validate: () => Promise<unknown>;
  revoke: () => Promise<unknown>;
  cleanup: () => Promise<unknown>;
}) {
  const results: Record<string, unknown> = {};
  const failed: string[] = [];
  for (const name of ['validate', 'revoke', 'cleanup'] as const) {
    try {
      results[name] = await tasks[name]();
    } catch {
      // Provider errors can contain tokens, addresses or private API payloads.
      // Only the failing stage is safe to expose to scheduler logs.
      failed.push(name);
      results[name] = { failed: true };
    }
  }
  return { results, failed };
}
