import type {
  GuardAction,
  GuardCollectionDetail,
  GuardItem,
  GuardOverview,
  GuardSnapshot,
} from './types';

const START = '2026-10-12T09:00:00.000Z';
const PREVIOUS = '2026-10-11T09:00:00.000Z';
const sampleIds = ['jfKfPfyJRdk', '5qap5aO4i9A', 'DWcJFNfaw9c', 'hHW1oY26kxQ'];

function item(title: string, index: number, channel: string): GuardItem {
  const id = sampleIds[index % sampleIds.length];
  return {
    id,
    title,
    channel,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnail: '',
    duration: ['24:18', '18:42', '32:06', '12:35'][index % 4],
    position: index + 1,
  };
}

export function createGuardDemo(zh = false): GuardCollectionDetail[] {
  const specs = zh
    ? [
        [
          '深度专注 · 音乐收藏',
          'playlist',
          [
            '雨夜咖啡馆 — 专注音乐',
            '安静的早晨 — 钢琴精选',
            '写作时光 — 无人声音乐',
            '周末书店 — 爵士精选',
          ],
        ],
        [
          '设计与创作灵感',
          'playlist',
          [
            '用留白建立视觉层级',
            '从草图到设计系统',
            '优秀产品的细节',
            '让设计更有节奏',
          ],
        ],
        [
          '值得收藏的编程课程',
          'channel',
          [
            'TypeScript 实用入门',
            '理解 React 状态',
            '构建一个小项目',
            'API 设计基础',
          ],
        ],
      ]
    : [
        [
          'Deep focus · music collection',
          'playlist',
          [
            'Rainy café — music for focus',
            'A quiet morning — piano sessions',
            'Writing hours — instrumental mix',
            'Weekend bookstore — jazz selection',
          ],
        ],
        [
          'Design & creative inspiration',
          'playlist',
          [
            'Creating hierarchy with whitespace',
            'From sketches to design systems',
            'The details of great products',
            'Finding rhythm in design',
          ],
        ],
        [
          'Programming worth keeping',
          'channel',
          [
            'Practical TypeScript foundations',
            'Understanding React state',
            'Build something small',
            'API design essentials',
          ],
        ],
      ];
  return specs.map(([name, source, titles], index) => {
    const all = (titles as string[]).map((title, n) =>
      item(title, n, zh ? '演示创作者' : 'Demo creator')
    );
    const missing = index === 0 ? [{ ...all[3], missingSince: START }] : [];
    const latest = index === 0 ? all.slice(0, 3) : all;
    const id = `demo-${index + 1}`;
    const snapshots: GuardSnapshot[] = [
      {
        id: `${id}-latest`,
        createdAt: START,
        itemCount: latest.length,
        added: 0,
        removed: missing.length,
        items: latest,
      },
      {
        id: `${id}-previous`,
        createdAt: PREVIOUS,
        itemCount: all.length,
        added: all.length,
        removed: 0,
        items: all,
      },
    ];
    return {
      id,
      name: name as string,
      source: source as 'playlist' | 'channel',
      url:
        source === 'channel'
          ? 'https://www.youtube.com/@YouTube'
          : 'https://www.youtube.com/playlist?list=PLdemoCollection00001',
      frequency: index === 0 ? 'daily' : 'weekly',
      enabled: index !== 2,
      notifyMissing: true,
      notifyAdded: false,
      emailDelivery: false,
      createdAt: '2026-10-01T09:00:00.000Z',
      lastSyncedAt: START,
      nextSyncAt: index === 2 ? null : '2026-10-13T09:00:00.000Z',
      lastError: null,
      itemCount: latest.length,
      missingCount: missing.length,
      runCount: 2,
      snapshots,
      missing,
    };
  });
}

export function guardDemoOverview(
  collections: GuardCollectionDetail[]
): GuardOverview {
  return {
    collections,
    entitlement: {
      plan: 'trial',
      limit: 15,
      trialEndsAt: '2026-10-20T09:00:00.000Z',
      canStartTrial: false,
    },
    capabilities: {
      youtube: true,
      email: false,
      scheduler: false,
      privateSources: false,
    },
  };
}

/** Deliberately isolated from user data, network requests, subscriptions and mail. */
export function applyGuardDemoAction(
  collections: GuardCollectionDetail[],
  action: GuardAction,
  zh = false
): GuardCollectionDetail[] {
  const now = new Date().toISOString();
  if (action.action === 'create') {
    if (collections.length >= 15)
      throw new Error(
        zh
          ? '演示最多可保存 15 个收藏。'
          : 'The demo supports up to 15 collections.'
      );
    const id = crypto.randomUUID();
    const items = [
      item(
        zh ? '你的第一个备份示例' : 'Your first sample backup',
        0,
        zh ? '演示创作者' : 'Demo creator'
      ),
    ];
    return [
      {
        ...action,
        id,
        enabled: true,
        createdAt: now,
        lastSyncedAt: now,
        nextSyncAt: null,
        lastError: null,
        itemCount: 1,
        missingCount: 0,
        runCount: 1,
        missing: [],
        snapshots: [
          {
            id: crypto.randomUUID(),
            createdAt: now,
            itemCount: 1,
            added: 1,
            removed: 0,
            items,
          },
        ],
      },
      ...collections,
    ];
  }
  if (action.action === 'delete')
    return collections.filter((c) => c.id !== action.id);
  return collections.map((c) => {
    if (c.id !== action.id) return c;
    if (action.action === 'update')
      return {
        ...c,
        ...action,
        nextSyncAt: action.enabled === false ? null : c.nextSyncAt,
      };
    const previous = c.snapshots[0]?.items ?? [];
    const removed = previous[0];
    const added = item(
      zh
        ? `新的收藏视频 · 第 ${c.runCount + 1} 次同步`
        : `A new discovery · sync ${c.runCount + 1}`,
      c.runCount,
      'Demo creator'
    );
    added.id = `demo-video-${c.runCount + 1}`;
    added.url = 'https://www.youtube.com/';
    const items = [...previous.slice(1), added].map((v, i) => ({
      ...v,
      position: i + 1,
    }));
    const missing = removed
      ? [
          { ...removed, missingSince: now },
          ...c.missing.filter((v) => v.id !== removed.id),
        ]
      : c.missing;
    return {
      ...c,
      lastSyncedAt: now,
      itemCount: items.length,
      missingCount: missing.length,
      runCount: c.runCount + 1,
      missing,
      snapshots: [
        {
          id: crypto.randomUUID(),
          createdAt: now,
          itemCount: items.length,
          added: 1,
          removed: removed ? 1 : 0,
          items,
        },
        ...c.snapshots,
      ].slice(0, 5),
    };
  });
}
