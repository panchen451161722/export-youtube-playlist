/** Preserve the browser's loopback host/port during local development only. */
export function paymentAppUrl(
  configuredUrl: string,
  requestUrl?: string,
  development = process.env.NODE_ENV === 'development'
) {
  const configured = new URL(configuredUrl || 'http://localhost:3000');
  const loopback = (url: URL) =>
    ['http:', 'https:'].includes(url.protocol) &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
    !url.username &&
    !url.password;
  if (development && requestUrl && loopback(configured)) {
    try {
      const request = new URL(requestUrl);
      if (loopback(request)) return request.origin;
    } catch {
      /* Fall back to the configured application origin. */
    }
  }
  return configured.origin;
}

/** Retries generate a new order number, but must retain every return destination. */
export function sameCheckoutReturnUrls(
  existing: { success_url?: string | null; cancel_url?: string | null },
  expected: { successUrl?: string; cancelUrl?: string }
) {
  if ((existing.cancel_url || '') !== (expected.cancelUrl || '')) return false;
  if ((existing.success_url || '') === (expected.successUrl || '')) return true;
  try {
    const previous = new URL(existing.success_url!);
    const next = new URL(expected.successUrl!);
    previous.searchParams.delete('order_no');
    next.searchParams.delete('order_no');
    return previous.href === next.href;
  } catch {
    return false;
  }
}
