// Render fixture emails locally. This script never calls a mail provider.
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { envConfigs } from '../src/config';
import { subscriptionEmail } from '../src/lib/emails/subscription';
import { guardNotificationEmail } from '../src/lib/playlist-guard/notifications';

const directory = resolve('data/email-brand-preview');
await mkdir(directory, { recursive: true });
await copyFile(resolve('public/logo.png'), resolve(directory, 'logo.png'));
const brand = {
  name: envConfigs.app_name,
  url: 'http://127.0.0.1:3104',
  logo: '/logo.png',
};
for (const locale of ['en', 'zh', 'de'] as const) {
  const common = {
    to: 'preview@example.invalid',
    id: `fixture-${locale}`,
    locale,
    brand,
    planName: 'Lite',
    amount: 990,
    currency: 'usd',
    interval: 'year',
    periodEnd: '2026-11-04T16:00:00Z',
  };
  const messages = {
    trial: subscriptionEmail({
      ...common,
      trial: true,
      paidAmount: 0,
      claim: {
        url: `${brand.url}/${locale === 'en' ? '' : `${locale}/`}claim-backup?purchase=preview#token=preview-only`,
        privatePlaylist: false,
      },
    }),
    paid: subscriptionEmail({
      ...common,
      trial: false,
      paidAmount: 990,
      periodEnd: '2027-10-28T16:00:00Z',
    }),
    changes: guardNotificationEmail(
      {
        name:
          locale === 'zh'
            ? '我的音乐收藏'
            : locale === 'de'
              ? 'Meine Musiksammlung'
              : 'My music collection',
        url: 'https://www.youtube.com/playlist?list=example',
        locale,
        snapshot: {
          id: 'preview-snapshot',
          createdAt: '2026-10-28T16:00:00Z',
          itemCount: 128,
          added: 4,
          removed: 2,
          restored: 1,
          items: [],
        },
        notifyAdded: true,
        notifyMissing: true,
        notifyRestored: true,
        emailDelivery: true,
      },
      common.to,
      brand,
      common.id
    ),
  };
  for (const [kind, message] of Object.entries(messages)) {
    await writeFile(
      resolve(directory, `${kind}-${locale}.html`),
      message.html!
    );
    await writeFile(resolve(directory, `${kind}-${locale}.txt`), message.text!);
  }
}
console.info(`Rendered email fixtures in ${directory}. No email was sent.`);
