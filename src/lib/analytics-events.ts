// Keep conversion payloads categorical. Never include user IDs, email addresses,
// playlist URLs/titles, order IDs, or raw error messages.
export const CLIENT_ANALYTICS_EVENTS = [
  'tool_run_started',
  'tool_run_succeeded',
  'tool_run_failed',
  'export_downloaded',
  'result_copied',
  'backup_cta_viewed',
  'backup_cta_clicked',
] as const;

export type ClientAnalyticsEvent = (typeof CLIENT_ANALYTICS_EVENTS)[number];
export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

const PROPERTY_KEYS = new Set([
  'tool',
  'output_format',
  'result_size',
  'truncated',
  'error_type',
  'media_type',
  'placement',
]);

export function analyticsProperties(input: AnalyticsProperties = {}) {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!PROPERTY_KEYS.has(key)) continue;
    if (typeof value === 'boolean') result[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value))
      result[key] = value;
    else if (typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,80}$/.test(value))
      result[key] = value;
  }
  return result;
}

export function isInteractiveEvent(event: ClientAnalyticsEvent) {
  return !['backup_cta_viewed', 'tool_run_failed'].includes(event);
}
