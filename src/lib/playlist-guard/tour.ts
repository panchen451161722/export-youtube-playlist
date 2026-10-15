import type { GuardFrequency, GuardItem, GuardSource } from './types';

export type TourVideo = GuardItem & {
  views?: number;
  /** A localized relative-time label key for the sample tour. */
  missingSince?: string;
};

export type TourCollection = {
  id: string;
  name: string;
  source: GuardSource;
  url?: string;
  frequency: GuardFrequency;
  enabled: boolean;
  createdLabel: string;
  lastSyncLabel: string;
  runCount: number;
  items: TourVideo[];
  missing: TourVideo[];
  notifyMissing: boolean;
  notifyAdded: boolean;
  notifyRestored: boolean;
  emailDelivery: boolean;
  exportFrequency: GuardFrequency;
};

export type TourTab = 'missing' | 'latest';
export type TourSort = 'default' | 'title' | 'views';
export const TOUR_PAGE_SIZE = 3;

function video(
  id: string,
  title: string,
  channel: string,
  duration: string,
  views: number,
  position: number,
  missingSince?: string
): TourVideo {
  return {
    id,
    title,
    channel,
    duration,
    views,
    position,
    missingSince,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

/** Deliberately illustrative metadata: the tour never queries a YouTube account. */
export function createTourCollection(
  id: 'old' | 'new',
  overrides: Partial<TourCollection> = {}
): TourCollection {
  const isNew = id === 'new';
  const items = isNew
    ? [
        video(
          'kJQP7kiw5Fk',
          'Luis Fonsi - Despacito ft. Daddy Yankee',
          'Luis Fonsi',
          '4:42',
          8_700_000_000,
          1
        ),
        video(
          'JGwWNGJdvx8',
          'Ed Sheeran - Shape of You (Official Music Video)',
          'Ed Sheeran',
          '4:24',
          6_300_000_000,
          2
        ),
        video(
          'OPf0YbXqDm0',
          'Mark Ronson - Uptown Funk ft. Bruno Mars',
          'Mark Ronson',
          '4:31',
          5_300_000_000,
          3
        ),
        video(
          'fRh_vgS2dFE',
          'Justin Bieber - Sorry (PURPOSE : The Movement)',
          'Justin Bieber',
          '3:26',
          3_800_000_000,
          4
        ),
        video(
          '09R8_2nJtjg',
          'Maroon 5 - Sugar (Official Music Video)',
          'Maroon 5',
          '5:02',
          4_100_000_000,
          5
        ),
      ]
    : [
        video(
          '1w7OgIMMRc4',
          'Guns N’ Roses - Sweet Child O’ Mine',
          'Guns N’ Roses',
          '5:02',
          1_500_000_000,
          1
        ),
        video(
          'lDK9QqIzhwk',
          'Bon Jovi - Livin’ On A Prayer',
          'Bon Jovi',
          '4:09',
          1_100_000_000,
          2
        ),
        video(
          'hTWKbfoikeg',
          'Nirvana - Smells Like Teen Spirit',
          'Nirvana',
          '4:38',
          1_800_000_000,
          3
        ),
        video(
          'CSvFpBOe8eY',
          'System Of A Down - Chop Suey!',
          'System Of A Down',
          '3:29',
          1_400_000_000,
          4
        ),
        video(
          'fJ9rUzIMcZQ',
          'Queen – Bohemian Rhapsody',
          'Queen',
          '5:57',
          1_900_000_000,
          5
        ),
        video(
          'v2AC41dglnM',
          'AC/DC - Thunderstruck',
          'AC/DC',
          '4:53',
          1_300_000_000,
          6
        ),
      ];

  const result: TourCollection = {
    id,
    name: isNew ? 'Top Tracks 2026' : 'Rock Classics 70s Legend',
    source: 'playlist',
    url: `https://www.youtube.com/playlist?list=PLdemo${isNew ? 'TopTracks2026' : 'RockClassics'}`,
    frequency: 'daily',
    enabled: true,
    createdLabel: isNew ? 'just_now' : 'one_month_ago',
    lastSyncLabel: isNew ? 'just_now' : 'two_hours_ago',
    runCount: isNew ? 1 : 34,
    items,
    missing: isNew
      ? []
      : [
          video(
            'dQw4w9WgXcQ',
            'Rick Astley - Never Gonna Give You Up (Official Music Video)',
            'Rick Astley',
            '3:33',
            1_600_000_000,
            7,
            'two_days_ago'
          ),
          video(
            '9jK-NcRmVcw',
            'Europe - The Final Countdown (Official Video)',
            'Europe',
            '4:56',
            1_200_000_000,
            8,
            'one_week_ago'
          ),
        ],
    notifyMissing: true,
    notifyAdded: true,
    notifyRestored: true,
    emailDelivery: false,
    exportFrequency: 'weekly',
    ...overrides,
  };
  if (result.source === 'subscriptions') {
    const channels: TourVideo[] = [
      '@YouTube',
      '@YouTubeCreators',
      '@YouTubeMusic',
    ].map((handle, index) => ({
      id: `demo-channel-${index}`,
      kind: 'channel',
      title: handle.slice(1),
      channel: handle.slice(1),
      url: `https://www.youtube.com/${handle}`,
      thumbnail: '',
      duration: '',
      position: index + 1,
    }));
    result.url = 'https://www.youtube.com/feed/channels';
    result.items = overrides.items ?? channels;
    result.missing = overrides.missing ?? [];
  }
  return result;
}

export function createTourCollections(): TourCollection[] {
  return [createTourCollection('old')];
}

export function sortedTourVideos(
  collection: TourCollection,
  tab: TourTab,
  sort: TourSort = 'default',
  search = ''
): TourVideo[] {
  const needle = search.trim().toLocaleLowerCase();
  const videos = (
    tab === 'missing' ? collection.missing : collection.items
  ).filter(
    (item) =>
      !needle ||
      `${item.title} ${item.channel}`.toLocaleLowerCase().includes(needle)
  );
  return videos.sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title);
    if (sort === 'views')
      return (b.views ?? -1) - (a.views ?? -1) || a.position - b.position;
    return a.position - b.position;
  });
}
