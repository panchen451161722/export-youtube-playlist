import type { EmailMessage } from '@/core/email';
import {
  brandedEmail,
  emailDetails,
  emailStats,
  emailUrl,
  escapeEmail,
  type EmailBrand,
} from '@/core/email/templates/branded';
import { checkoutLocale } from '@/lib/backup-checkout';
import { emailDate } from '@/lib/emails/subscription';
import { m } from '@/paraglide/messages.js';

import type { GuardCollectionDetail, GuardSnapshot } from './types';

export type GuardNotificationPayload = {
  name: string;
  url: string;
  locale: 'zh' | 'en' | 'de';
  snapshot: GuardSnapshot;
  notifyMissing: boolean;
  notifyAdded: boolean;
  notifyRestored?: boolean;
  emailDelivery: boolean;
  kind?: 'video' | 'channel';
};
export function notificationPayload(
  collection: GuardCollectionDetail,
  locale: string
): GuardNotificationPayload | null {
  const snapshot = collection.snapshots[0];
  if (
    !snapshot ||
    !(
      collection.emailDelivery ||
      (collection.notifyMissing && snapshot.removed > 0) ||
      (collection.notifyAdded && snapshot.added > 0) ||
      (collection.notifyRestored && (snapshot.restored ?? 0) > 0)
    )
  )
    return null;
  return {
    name: collection.name,
    url: collection.url,
    locale: checkoutLocale(locale),
    snapshot,
    notifyMissing: collection.notifyMissing,
    notifyAdded: collection.notifyAdded,
    notifyRestored: !!collection.notifyRestored,
    emailDelivery: collection.emailDelivery,
    kind: collection.source === 'subscriptions' ? 'channel' : 'video',
  };
}
export function guardNotificationEmail(
  payload: GuardNotificationPayload,
  recipient: string,
  app: EmailBrand,
  id: string
): EmailMessage {
  const locale = checkoutLocale(payload.locale);
  const t = (
    key:
      | Extract<keyof typeof m, `email.brand.${string}`>
      | 'guestClaim.email_body'
      | 'privateCheckout.email_body'
      | 'guestClaim.email_action'
  ) => m[key]({}, { locale });
  const snapshot = payload.snapshot;
  const changed =
    (payload.notifyAdded && snapshot.added > 0) ||
    (payload.notifyMissing && snapshot.removed > 0) ||
    (payload.notifyRestored && (snapshot.restored ?? 0) > 0);
  const title = changed
    ? t('email.brand.title_changes')
    : t('email.brand.title_report');
  const intro = changed
    ? t('email.brand.intro_changes')
    : t('email.brand.intro_report');
  const itemLabel =
    payload.kind === 'channel'
      ? t('email.brand.channels')
      : t('email.brand.videos');
  const stats = [
    ...(payload.notifyAdded
      ? [{ label: t('email.brand.new'), value: snapshot.added }]
      : []),
    ...(payload.notifyMissing
      ? [{ label: t('email.brand.missing'), value: snapshot.removed }]
      : []),
    ...(payload.notifyRestored
      ? [{ label: t('email.brand.restored'), value: snapshot.restored ?? 0 }]
      : []),
  ];
  const link = `${app.url.replace(/\/$/, '')}${locale === 'zh' ? '/zh' : ''}/settings/collections`;
  const details: [string, string][] = [
    [t('email.brand.collection'), payload.name],
    [t('email.brand.checked'), emailDate(snapshot.createdAt, locale)],
    [t('email.brand.current'), `${snapshot.itemCount} ${itemLabel}`],
  ];
  const attachmentNote = payload.emailDelivery
    ? t('email.brand.attachment')
    : t('email.brand.saved');
  const note = [
    attachmentNote,
    ...(payload.notifyMissing && snapshot.removed > 0
      ? [t('email.brand.missing_note')]
      : []),
  ].join(' ');
  const footer = t('email.brand.why_changes');
  return {
    to: recipient,
    subject: `${app.name}: ${payload.name.replace(/[\r\n]/g, ' ').slice(0, 100)} — ${title}`,
    text: [
      title,
      intro,
      ...details.map(([label, value]) => `${label}: ${value}`),
      ...stats.map(({ label, value }) =>
        locale === 'zh'
          ? `${label}${itemLabel}：${value}`
          : `${label} ${itemLabel}: ${value}`
      ),
      `${t('email.brand.source')}: ${payload.url}`,
      note,
      `${t('email.brand.view_changes')}: ${link}`,
      footer,
    ].join('\n\n'),
    html: brandedEmail({
      brand: app,
      locale,
      title,
      intro,
      eyebrow: t('email.brand.eyebrow_changes'),
      preheader: `${payload.name} · ${snapshot.itemCount} ${itemLabel}`,
      content:
        emailDetails(details) +
        emailStats(stats) +
        `<p style="margin:16px 0 0;font-size:12px;line-height:20px"><a href="${emailUrl(payload.url, app.url)}" style="color:#a52b5d;overflow-wrap:anywhere">${escapeEmail(t('email.brand.source'))}</a></p>`,
      action: t('email.brand.view_changes'),
      actionUrl: link,
      note,
      footer,
      footerLink: t('email.brand.manage_notifications'),
      footerUrl: link,
      visit: t('email.brand.visit'),
    }),
    idempotencyKey: `playlist-guard/${id}`,
    attachments: payload.emailDelivery
      ? [
          {
            filename: `playlist-snapshot-${snapshot.createdAt.slice(0, 10)}.json`,
            content: Buffer.from(JSON.stringify(snapshot, null, 2)),
            contentType: 'application/json',
          },
        ]
      : undefined,
  };
}
