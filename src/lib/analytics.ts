import {
  analyticsProperties,
  CLIENT_ANALYTICS_EVENTS,
  isInteractiveEvent,
  type AnalyticsProperties,
  type ClientAnalyticsEvent,
} from '@/lib/analytics-events';
import { trackClarityEvent } from '@/lib/clarity';
import { isPrivateDocumentPath } from '@/lib/private-document';

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: {
        props?: Record<string, string | number | boolean>;
        interactive?: boolean;
      }
    ) => void;
  }
}

/** Analytics must never turn a successful export into a product error. */
export function trackEvent(
  event: ClientAnalyticsEvent,
  properties: AnalyticsProperties = {}
) {
  if (typeof window === 'undefined') return;
  if (!CLIENT_ANALYTICS_EVENTS.includes(event)) return;
  if (isPrivateDocumentPath(window.location.pathname)) return;
  const props = analyticsProperties(properties);
  if (import.meta.env?.DEV) {
    console.debug('[analytics]', event, props);
    return;
  }
  try {
    trackClarityEvent(event, props);
  } catch {
    /* Optional tracker. */
  }
  try {
    window.plausible?.(event, {
      props,
      interactive: isInteractiveEvent(event),
    });
  } catch {
    /* Optional tracker; downloads and navigation must continue. */
  }
}
