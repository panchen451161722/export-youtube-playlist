import type { EmailMessage } from '@/core/email';
import {
  brandedEmail,
  emailDetails,
  escapeEmail,
  type EmailBrand,
} from '@/core/email/templates/branded';
import { checkoutLocale } from '@/lib/backup-checkout';
import { m } from '@/paraglide/messages.js';

export function emailDate(
  value: Date | string | null | undefined,
  locale: string
): string {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(
        locale === 'zh' ? 'zh-CN' : locale === 'de' ? 'de-DE' : 'en-US',
        { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }
      ).format(date) + ' UTC'
    : m['email.brand.details']({}, { locale: checkoutLocale(locale) });
}
export function emailMoney(
  amount: number | null | undefined,
  currency: string,
  locale: string
): string {
  if (amount == null)
    return m['email.brand.details']({}, { locale: checkoutLocale(locale) });
  const formatter = new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amount / 10 ** digits);
}
export interface SubscriptionEmailInput {
  to: string;
  id: string;
  locale: string;
  brand: EmailBrand;
  planName: string;
  trial: boolean;
  ended?: boolean;
  amount: number | null;
  currency: string;
  paidAmount: number | null;
  paidCurrency?: string | null;
  periodEnd: Date | string | null;
  interval: string | null;
  intervalCount?: number | null;
  claim?: { url: string; privatePlaylist: boolean };
}
export function subscriptionEmail(input: SubscriptionEmailInput): EmailMessage {
  const locale = checkoutLocale(input.locale);
  const options = { locale };
  const t = (
    key:
      | Extract<keyof typeof m, `email.brand.${string}`>
      | 'guestClaim.email_body'
      | 'privateCheckout.email_body'
      | 'guestClaim.email_action'
  ) => m[key]({}, options);
  const title = input.ended
    ? t('email.brand.title_ended')
    : input.trial
      ? t('email.brand.title_trial')
      : t('email.brand.title_active');
  const intro = input.ended
    ? t('email.brand.intro_ended')
    : input.claim
      ? input.claim.privatePlaylist
        ? t('email.brand.intro_private')
        : t('email.brand.intro_guest')
      : input.trial
        ? t('email.brand.intro_trial')
        : t('email.brand.intro_active');
  const period =
    input.interval === 'year'
      ? t('email.brand.year')
      : input.interval === 'month'
        ? t('email.brand.month')
        : input.interval || '';
  const price =
    emailMoney(input.amount, input.currency, locale) +
    (period
      ? ` / ${input.intervalCount && input.intervalCount > 1 ? `${input.intervalCount} ` : ''}${period}`
      : '');
  const end = emailDate(input.periodEnd, locale);
  const details: [string, string][] = [
    [
      t('email.brand.plan'),
      `${input.planName}${input.trial ? ` · ${t('email.brand.free_trial')}` : ''}`,
    ],
    [
      t('email.brand.today'),
      emailMoney(
        input.paidAmount,
        input.paidCurrency || input.currency,
        locale
      ),
    ],
    ...(input.trial ? [[t('email.brand.ends'), end] as [string, string]] : []),
    [
      input.trial
        ? t('email.brand.first_charge')
        : t('email.brand.next_charge'),
      end,
    ],
    [t('email.brand.price'), price],
  ];
  const benefits = (
    input.ended
      ? []
      : ([
          'email.brand.benefit_exports',
          'email.brand.benefit_snapshots',
          'email.brand.benefit_private',
          'email.brand.benefit_formats',
        ] as const)
  ).map((key) => t(key));
  const billingNote = input.ended ? '' : t('email.brand.billing_note');
  const claimNote = input.claim ? t('email.brand.claim_note') : '';
  const prefix = locale === 'en' ? '' : `/${locale}`;
  const action = input.claim
    ? t('guestClaim.email_action')
    : t('email.brand.open_backup');
  const actionUrl =
    input.claim?.url ||
    `${input.brand.url.replace(/\/$/, '')}${prefix}/youtube-playlist-backup`;
  // Billing currently has English and Chinese content only.
  const billingUrl = `${input.brand.url.replace(/\/$/, '')}${locale === 'zh' ? '/zh' : ''}/settings/billing`;
  const footer = t('email.brand.why_subscription');
  return {
    to: input.to,
    subject: `${input.brand.name}: ${title}`,
    idempotencyKey: `subscription-welcome/${input.id}`,
    text: [
      title,
      intro,
      ...(input.ended ? [] : details.map(([key, value]) => `${key}: ${value}`)),
      billingNote,
      ...benefits,
      `${action}: ${actionUrl}`,
      claimNote,
      `${t('email.brand.manage_subscription')}: ${billingUrl}`,
      footer,
    ]
      .filter(Boolean)
      .join('\n\n'),
    html: brandedEmail({
      brand: input.brand,
      locale,
      title,
      intro,
      preheader: `${input.planName} · ${end} · ${price}`,
      eyebrow: t('email.brand.eyebrow_subscription'),
      content:
        (input.ended ? '' : emailDetails(details)) +
        `<p style="font-size:12px;line-height:20px;color:#7b6b77;margin:16px 0 26px">${escapeEmail(billingNote)}</p><h2 style="font-size:16px;line-height:24px;margin:0 0 12px">${input.ended ? '' : escapeEmail(t('email.brand.benefits_title'))}</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${benefits.map((item) => `<tr><td width="24" valign="top" style="padding:5px 0;color:#bd356b;font-size:15px">&#10003;</td><td style="font-size:13px;line-height:21px;padding:5px 0;color:#665765">${escapeEmail(item)}</td></tr>`).join('')}</table>`,
      action,
      actionUrl,
      note: claimNote || undefined,
      footer,
      footerLink: t('email.brand.manage_subscription'),
      footerUrl: billingUrl,
      visit: t('email.brand.visit'),
    }),
  };
}
