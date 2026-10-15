import type { EmailMessage } from '@/core/email';

import type { GuardCollectionDetail, GuardSnapshot } from './types';

export type GuardNotificationPayload = {
  name: string;
  url: string;
  locale: 'zh' | 'en';
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
    locale: locale === 'zh' ? 'zh' : 'en',
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
  app: { name: string; url: string },
  id: string
): EmailMessage {
  const zh = payload.locale === 'zh';
  const snapshot = payload.snapshot;
  const itemLabel =
    payload.kind === 'channel'
      ? zh
        ? '频道'
        : 'channels'
      : zh
        ? '视频'
        : 'videos';
  const link = `${app.url.replace(/\/$/, '')}${zh ? '/zh' : ''}/settings/collections`;
  const lines = [
    payload.name,
    zh
      ? `自动检查已完成：${snapshot.createdAt}`
      : `Scheduled check completed: ${snapshot.createdAt}`,
    zh
      ? `当前${itemLabel}：${snapshot.itemCount}`
      : `Current ${itemLabel}: ${snapshot.itemCount}`,
    ...(payload.notifyMissing
      ? [
          zh
            ? `丢失${itemLabel}：${snapshot.removed}`
            : `Missing ${itemLabel}: ${snapshot.removed}`,
        ]
      : []),
    ...(payload.notifyAdded
      ? [
          zh
            ? `新增${itemLabel}：${snapshot.added}`
            : `New ${itemLabel}: ${snapshot.added}`,
        ]
      : []),
    ...(payload.notifyRestored
      ? [
          zh
            ? `恢复${itemLabel}：${snapshot.restored ?? 0}`
            : `Restored ${itemLabel}: ${snapshot.restored ?? 0}`,
        ]
      : []),
    '',
    `${zh ? '来源' : 'Source'}: ${payload.url}`,
    `${zh ? '查看收藏与管理通知' : 'View collection and manage notifications'}: ${link}`,
    payload.emailDelivery
      ? zh
        ? '附件为本次元数据备份，不包含视频或音频文件。'
        : 'The attached backup contains metadata, not video or audio files.'
      : zh
        ? '已保存的版本可在工作台中查看。'
        : 'Saved snapshots are available in your workspace.',
  ];
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]!
    );
  return {
    to: recipient,
    subject: `${app.name}: ${payload.name.replace(/[\r\n]/g, ' ').slice(0, 100)} — ${zh ? '收藏检查报告' : 'collection report'}`,
    text: lines.join('\n'),
    html: `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#1a213c"><h2>${escape(payload.name)}</h2>${lines
      .slice(1)
      .map((line) => `<p>${escape(line)}</p>`)
      .join('')}</div>`,
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
