type ClarityTagValue = string | number | boolean | null | undefined;

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

const SAFE_VALUE_PATTERN = /[^a-zA-Z0-9_.:-]/g;

function safeValue(value: ClarityTagValue): string {
  return String(value ?? '')
    .slice(0, 120)
    .replace(SAFE_VALUE_PATTERN, '_');
}

export function trackClarityEvent(
  event: string,
  tags: Record<string, ClarityTagValue> = {}
) {
  if (typeof window === 'undefined' || !window.clarity) return;

  for (const [key, value] of Object.entries(tags)) {
    if (value === undefined || value === null || value === '') continue;
    window.clarity('set', safeValue(key), safeValue(value));
  }
  window.clarity('event', safeValue(event));
}

export function resultSizeBucket(count: number): string {
  if (count <= 0) return '0';
  if (count <= 10) return '1_10';
  if (count <= 50) return '11_50';
  if (count <= 100) return '51_100';
  if (count <= 500) return '101_500';
  return '501_plus';
}

export function clarityErrorType(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('invalid') || message.includes('valid youtube')) {
    return 'invalid_url';
  }
  if (
    message.includes('not_found') ||
    message.includes('private') ||
    message.includes('deleted')
  ) {
    return 'not_found_or_private';
  }
  if (message.includes('quota')) return 'quota';
  if (message.includes('timeout')) return 'timeout';
  if (message.includes('rate') || message.includes('wait before')) {
    return 'rate_limit';
  }
  if (message.includes('api_key_missing')) return 'configuration';
  if (message.includes('export_generation_failed')) return 'export_generation';
  return 'unknown';
}
