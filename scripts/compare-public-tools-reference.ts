import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { analyzeChannelVideos } from '../src/components/tools/channel-tool-utils';
import { createChannelExportCsv } from '../src/components/tools/public-tool-export';
import type {
  ChannelPlaylist,
  ChannelVideo,
} from '../src/components/tools/types';
import {
  getChannelToolData,
  getVideoToolData,
} from '../src/modules/youtube-public/service';

const fixtureDirectory = process.argv[2] || '/private/tmp/ref-tool-data';
const playlistReferencePath =
  process.argv[3] ||
  path.resolve('data/Python Programming Beginner Tutorials.csv');
const playlistCurrentPath =
  process.argv[4] ||
  path.resolve('data/Python-Programming-Beginner-Tutorials–my.csv');

async function json<T>(fileName: string): Promise<T> {
  return JSON.parse(
    await readFile(path.join(fixtureDirectory, fileName), 'utf8')
  ) as T;
}

function withoutHash(value: string) {
  return value.replace(/^#/, '');
}

function parseList(value: unknown): string[] {
  if (typeof value !== 'string' || value === '[]') return [];
  return value
    .replace(/^\[|\]$/g, '')
    .split(', ')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsv(value: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quoted) {
      if (char === '"' && value[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\r' || char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (char === '\r' && value[index + 1] === '\n') index += 1;
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

function videoId(url: string) {
  return new URL(url).searchParams.get('v') || '';
}

type Comparison = {
  tool: string;
  matched: number;
  compared: number;
  rate: number;
  notes: string;
};

function comparison(
  tool: string,
  pairs: Array<[unknown, unknown]>,
  notes = ''
): Comparison {
  const matched = pairs.filter(
    ([current, reference]) => String(current ?? '') === String(reference ?? '')
  ).length;
  const compared = pairs.length;
  return {
    tool,
    matched,
    compared,
    rate: compared ? Number(((matched / compared) * 100).toFixed(2)) : 100,
    notes,
  };
}

function comparisonBy(
  tool: string,
  pairs: Array<[unknown, unknown]>,
  matches: (current: unknown, reference: unknown) => boolean,
  notes = ''
): Comparison {
  const matched = pairs.filter(([current, reference]) =>
    matches(current, reference)
  ).length;
  const compared = pairs.length;
  return {
    tool,
    matched,
    compared,
    rate: compared ? Number(((matched / compared) * 100).toFixed(2)) : 100,
    notes,
  };
}

function canonicalList(value: unknown) {
  return parseList(value)
    .map((item) => item.toLowerCase())
    .sort()
    .join('\n');
}

function csvObjects(csv: string): Array<Record<string, string>> {
  const [rawHeaders = [], ...rows] = parseCsv(csv);
  const headers = rawHeaders.map((header) => header.replace(/^\uFEFF/, ''));
  return rows
    .filter((row) => row.some((value) => value !== ''))
    .map((row) =>
      Object.fromEntries(
        headers.map((header, index) => [header, row[index] ?? ''])
      )
    );
}

function clockToSeconds(value: string): number {
  return value
    .split(':')
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}

function normalizeTimestamp(value: string): string {
  return value.replace(/Z$/, '');
}

function matchesWithOnePercentTolerance(
  current: unknown,
  reference: unknown
): boolean {
  const currentNumber = Number(current);
  const referenceNumber = Number(reference);
  if (
    Number.isFinite(currentNumber) &&
    Number.isFinite(referenceNumber) &&
    referenceNumber !== 0
  ) {
    return (
      Math.abs(currentNumber - referenceNumber) / Math.abs(referenceNumber) <=
      0.01
    );
  }
  return String(current ?? '') === String(reference ?? '');
}

async function main() {
  const [
    refThumbnail,
    refTags,
    refDescription,
    refRestrictions,
    refEmbed,
    refChannelId,
    refPlaylistUrl,
    refSubscribe,
    refPlaylists,
    refLinks,
    refExport,
    refAnalysis,
    refKeywords,
    refAssets,
    playlistReferenceCsv,
    playlistCurrentCsv,
  ] = await Promise.all([
    json<any>('thumbnail.json'),
    json<any>('tags.json'),
    json<any>('description.json'),
    json<any>('restrictions.json'),
    json<any>('embed.json'),
    json<any>('channel-id.json'),
    json<any>('channel-playlist-url.json'),
    json<any>('subscribe-link.json'),
    json<any>('channel-playlists.json'),
    json<any>('channel-links.json'),
    json<any>('channel-export.json'),
    json<any>('channel-analysis.json'),
    json<any>('channel-keywords.json'),
    json<any>('channel-assets.json'),
    readFile(playlistReferencePath, 'utf8'),
    readFile(playlistCurrentPath, 'utf8'),
  ]);

  const playlistReferenceRows = csvObjects(playlistReferenceCsv);
  const playlistCurrentRows = csvObjects(playlistCurrentCsv);
  if (
    playlistReferenceRows.length === 0 ||
    playlistReferenceRows.length !== playlistCurrentRows.length
  ) {
    throw new Error(
      `Playlist fixtures must contain the same non-zero row count (reference=${playlistReferenceRows.length}, current=${playlistCurrentRows.length}).`
    );
  }

  const videoFetch: typeof fetch = async () =>
    Response.json({
      items: [
        {
          id: refEmbed.video_id,
          snippet: {
            title: refDescription.title,
            description: refDescription.description,
            channelId: refChannelId.channel_id,
            channelTitle: refDescription.channel_title,
            thumbnails: {
              maxres: { url: refDescription.thumbnail },
            },
            tags: refTags.tags,
          },
          contentDetails: {
            duration: 'PT0S',
            regionRestriction:
              refRestrictions.restriction_type === 'blocked'
                ? { blocked: refRestrictions.regions }
                : refRestrictions.restriction_type === 'allowed'
                  ? { allowed: refRestrictions.regions }
                  : undefined,
          },
          statistics: {
            viewCount: refDescription.views,
            likeCount: refDescription.likes,
            commentCount: refDescription.comments,
          },
          status: { embeddable: true },
        },
      ],
    });

  const currentVideo = await getVideoToolData({
    input: refEmbed.video_id,
    apiKey: ['fixture', 'key'].join('-'),
    fetchImpl: videoFetch,
  });

  const videoRows = refLinks.videos as Array<Record<string, any>>;
  const columns = refExport.video_data as Record<string, any[]>;
  const sourceVideos = videoRows.map((item, index) => {
    const seconds = Number(columns['Duration in seconds'][index] ?? 0);
    return {
      position: index + 1,
      videoId: videoId(item.url),
      title: item.title,
      url: item.url,
      description: item.description,
      channelTitle: item.channelName,
      publishedAt: `${item.date}Z`,
      thumbnailUrl: item.thumbnailUrl,
      duration: columns['Duration in timestamp'][index],
      durationText: columns.Duration[index],
      durationSeconds: seconds,
      durationMinutes: Number(columns['Duration in minutes'][index]),
      viewCount: String(item.views ?? ''),
      likeCount: String(item.likes ?? ''),
      commentCount: String(item.comments ?? ''),
      tags: parseList(columns.Tags[index]).map(withoutHash),
      descriptionTags: parseList(columns['Tags (in description)'][index]).map(
        withoutHash
      ),
      emails: parseList(columns['Emails (in description)'][index]),
      links: parseList(columns['Links (in description)'][index]),
      mediaType: seconds < 60 ? ('shorts' as const) : ('videos' as const),
    } satisfies ChannelVideo;
  });

  const sourcePlaylists = (refPlaylists.playlists as any[]).map(
    (item): ChannelPlaylist => ({
      playlistId: item.id,
      title: item.title,
      description: item.description,
      thumbnailUrl: item.thumbnail_url,
      videoCount: item.video_count,
      publishedAt: '',
      url: `https://www.youtube.com/playlist?list=${item.id}`,
    })
  );

  const channelFetch: typeof fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname.endsWith('/channels')) {
      return Response.json({
        items: [
          {
            id: refChannelId.channel_id,
            snippet: {
              title: refChannelId.title,
              customUrl: refChannelId.custom_url,
              country: refChannelId.country,
              thumbnails: {
                default: { url: refAssets.logos['Default (88x88)'] },
                medium: { url: refAssets.logos['Medium (240x240)'] },
                high: { url: refAssets.logos['High (800x800)'] },
              },
            },
            contentDetails: {
              relatedPlaylists: { uploads: refPlaylistUrl.playlist_id },
            },
            statistics: { videoCount: String(sourceVideos.length) },
            brandingSettings: {
              channel: { keywords: refKeywords.raw_keywords },
              image: {
                bannerExternalUrl: String(
                  refAssets.banners['TV (2560x1440)']
                ).replace(/=w2560$/, ''),
              },
            },
          },
        ],
      });
    }
    if (url.pathname.endsWith('/playlistItems')) {
      const page = Number(url.searchParams.get('pageToken') || 0);
      const items = sourceVideos.slice(page * 50, page * 50 + 50);
      return Response.json({
        pageInfo: { totalResults: sourceVideos.length },
        nextPageToken:
          (page + 1) * 50 < sourceVideos.length ? String(page + 1) : undefined,
        items: items.map((item) => ({
          snippet: { resourceId: { videoId: item.videoId } },
          contentDetails: {
            videoId: item.videoId,
            videoPublishedAt: item.publishedAt,
          },
        })),
      });
    }
    if (url.pathname.endsWith('/videos')) {
      const ids = new Set((url.searchParams.get('id') || '').split(','));
      return Response.json({
        items: sourceVideos
          .filter((item) => ids.has(item.videoId))
          .map((item) => ({
            id: item.videoId,
            snippet: {
              title: item.title,
              description: item.description,
              channelTitle: item.channelTitle,
              publishedAt: item.publishedAt,
              thumbnails: { maxres: { url: item.thumbnailUrl } },
              tags: item.tags,
            },
            contentDetails: { duration: `PT${item.durationSeconds ?? 0}S` },
            statistics: {
              viewCount: item.viewCount,
              likeCount: item.likeCount,
              commentCount: item.commentCount,
            },
          })),
      });
    }
    if (url.pathname.endsWith('/playlists')) {
      const page = Number(url.searchParams.get('pageToken') || 0);
      const items = sourcePlaylists.slice(page * 50, page * 50 + 50);
      return Response.json({
        nextPageToken:
          (page + 1) * 50 < sourcePlaylists.length
            ? String(page + 1)
            : undefined,
        items: items.map((item) => ({
          id: item.playlistId,
          snippet: {
            title: item.title,
            description: item.description,
            thumbnails: { maxres: { url: item.thumbnailUrl } },
          },
          contentDetails: { itemCount: item.videoCount },
        })),
      });
    }
    return Response.json({}, { status: 404 });
  };

  const currentChannel = await getChannelToolData({
    input: refChannelId.channel_id,
    includeVideos: true,
    includePlaylists: true,
    limit: 5_000,
    apiKey: ['fixture', 'key'].join('-'),
    fetchImpl: channelFetch,
  });

  const comparisons: Comparison[] = [
    comparison(
      'youtube-playlist-link-extractor',
      playlistCurrentRows.flatMap((current, index) => {
        const reference = playlistReferenceRows[index];
        return [
          [index + 1, index + 1],
          [current.URL, reference['Video url']],
        ] as Array<[unknown, unknown]>;
      }),
      'Same row count, order, index, and canonical watch URL.'
    ),
    comparison(
      'youtube-playlist-title-extractor',
      playlistCurrentRows.flatMap((current, index) => {
        const reference = playlistReferenceRows[index];
        return [
          [index + 1, index + 1],
          [current.Title, reference.Title],
        ] as Array<[unknown, unknown]>;
      }),
      'Same row count, order, index, and title.'
    ),
    comparisonBy(
      'youtube-playlist-analyzer',
      playlistCurrentRows.flatMap((current, index) => {
        const reference = playlistReferenceRows[index];
        return [
          [current['Video ID'], videoId(reference['Video url'])],
          [current.Title, reference.Title],
          [current.URL, reference['Video url']],
          [current.Channel, reference['Channel name']],
          [clockToSeconds(current.Duration), reference['Duration in seconds']],
          [
            normalizeTimestamp(current['Published At']),
            normalizeTimestamp(reference['Uploaded Time']),
          ],
          [current.Views, reference.Views],
        ] as Array<[unknown, unknown]>;
      }),
      matchesWithOnePercentTolerance,
      'Stable fields use exact matching; time-varying view counts allow 1% relative difference.'
    ),
  ];
  comparisons.push(
    comparison('download-youtube-thumbnail', [
      [currentVideo.title, refThumbnail.title],
      ...Object.keys(refThumbnail.thumbnails).flatMap((key) => [
        [
          currentVideo.thumbnails[key as keyof typeof currentVideo.thumbnails]
            .url,
          refThumbnail.thumbnails[key].url,
        ] as [unknown, unknown],
        [
          currentVideo.thumbnails[key as keyof typeof currentVideo.thumbnails]
            .width,
          refThumbnail.thumbnails[key].width,
        ] as [unknown, unknown],
        [
          currentVideo.thumbnails[key as keyof typeof currentVideo.thumbnails]
            .height,
          refThumbnail.thumbnails[key].height,
        ] as [unknown, unknown],
      ]),
    ])
  );
  comparisons.push(
    comparison('youtube-tag-extractor', [
      [currentVideo.title, refTags.title],
      [currentVideo.tags.join('\n'), refTags.tags.join('\n')],
      [
        currentVideo.descriptionTags.join('\n'),
        refTags.description_tags.join('\n'),
      ],
    ])
  );
  comparisons.push(
    comparison('youtube-description-extractor', [
      [currentVideo.title, refDescription.title],
      [currentVideo.description, refDescription.description],
      [currentVideo.emails.join('\n'), refDescription.emails.join('\n')],
      [currentVideo.links.join('\n'), refDescription.links.join('\n')],
      [currentVideo.channelTitle, refDescription.channel_title],
      [currentVideo.thumbnailUrl, refDescription.thumbnail],
      [currentVideo.viewCount, refDescription.views],
      [currentVideo.likeCount, refDescription.likes],
      [currentVideo.commentCount, refDescription.comments],
    ])
  );
  comparisons.push(
    comparison('youtube-embed-code-generator', [
      [currentVideo.videoId, refEmbed.video_id],
    ])
  );
  comparisons.push(
    comparison('youtube-region-restriction-checker', [
      [currentVideo.title, refRestrictions.title],
      [currentVideo.videoId, refRestrictions.video_id],
      [currentVideo.thumbnailUrl, refRestrictions.thumbnail_url],
      [currentVideo.regionRestriction.type, refRestrictions.restriction_type],
      [
        currentVideo.regionRestriction.regions.join('\n'),
        refRestrictions.regions.join('\n'),
      ],
    ])
  );
  comparisons.push(
    comparison('youtube-channel-id-finder', [
      [currentChannel.title, refChannelId.title],
      [currentChannel.customUrl, refChannelId.custom_url],
      [currentChannel.thumbnailUrl, refChannelId.thumbnail],
      [currentChannel.country, refChannelId.country],
      [currentChannel.channelId, refChannelId.channel_id],
    ])
  );
  comparisons.push(
    comparison('youtube-channel-to-playlist', [
      [currentChannel.uploadsPlaylistUrl, refPlaylistUrl.playlist_url],
      [currentChannel.uploadsPlaylistId, refPlaylistUrl.playlist_id],
    ])
  );
  comparisons.push(
    comparison('youtube-subscribe-link-generator', [
      [currentChannel.subscribeUrl, refSubscribe.subscribe_link],
      [currentChannel.title, refSubscribe.title],
      [currentChannel.thumbnailUrl, refSubscribe.thumbnail],
    ])
  );
  comparisons.push(
    comparison(
      'youtube-channel-playlist-extractor',
      currentChannel.playlists.flatMap((item, index) => {
        const reference = refPlaylists.playlists[index];
        return [
          [item.playlistId, reference.id],
          [item.title, reference.title],
          [item.description, reference.description],
          [item.thumbnailUrl, reference.thumbnail_url],
          [item.videoCount, reference.video_count],
        ] as Array<[unknown, unknown]>;
      })
    )
  );
  const channelVideoPairs = currentChannel.videos.flatMap((item, index) => {
    const reference = refLinks.videos[index];
    return [
      [item.url, reference.url],
      [item.title, reference.title],
      [item.durationSeconds, reference.duration],
      [item.viewCount, reference.views],
      [item.likeCount, reference.likes],
      [item.commentCount, reference.comments],
      [item.publishedAt.replace(/Z$/, ''), reference.date],
      [item.channelTitle, reference.channelName],
      [item.thumbnailUrl, reference.thumbnailUrl],
      [item.description, reference.description],
    ] as Array<[unknown, unknown]>;
  });
  comparisons.push(
    comparison('youtube-channel-video-link-extractor', channelVideoPairs)
  );
  comparisons.push(
    comparison(
      'youtube-channel-title-extractor',
      currentChannel.videos.flatMap((item, index) => [
        [item.title, refLinks.videos[index].title],
        [item.url, refLinks.videos[index].url],
      ])
    )
  );

  const currentCsv = parseCsv(createChannelExportCsv(currentChannel.videos));
  const exportPairs: Array<[unknown, unknown]> = [];
  for (
    let columnIndex = 0;
    columnIndex < currentCsv[0].length;
    columnIndex += 1
  ) {
    const header = currentCsv[0][columnIndex];
    exportPairs.push([header, header]);
    for (let rowIndex = 1; rowIndex < currentCsv.length; rowIndex += 1) {
      const current = currentCsv[rowIndex][columnIndex];
      const reference = columns[header][rowIndex - 1];
      exportPairs.push([
        [
          'Tags',
          'Tags (in description)',
          'Emails (in description)',
          'Links (in description)',
        ].includes(header)
          ? canonicalList(current)
          : current,
        [
          'Tags',
          'Tags (in description)',
          'Emails (in description)',
          'Links (in description)',
        ].includes(header)
          ? canonicalList(reference)
          : reference,
      ]);
    }
  }
  comparisons.push(
    comparison(
      'export-youtube-channel',
      exportPairs,
      'List-valued cells compare case-insensitive content regardless of item order.'
    )
  );

  const currentAnalysis = analyzeChannelVideos(currentChannel.videos);
  comparisons.push(
    comparison('youtube-channel-analyzer', [
      [currentAnalysis.videoCount, refAnalysis.count],
      [currentAnalysis.totalDuration, refAnalysis.duration.total_seconds],
      [currentAnalysis.totalViews, refAnalysis.engagement.total_views],
      [currentAnalysis.totalLikes, refAnalysis.engagement.total_likes],
      [currentAnalysis.totalComments, refAnalysis.engagement.total_comments],
      [
        Math.round(currentAnalysis.averageViews),
        refAnalysis.engagement.avg_views,
      ],
      [
        Math.round(currentAnalysis.averageLikes),
        refAnalysis.engagement.avg_likes,
      ],
      [
        Math.round(currentAnalysis.averageComments),
        refAnalysis.engagement.avg_comments,
      ],
      [
        Number(currentAnalysis.likeRate.toFixed(2)),
        refAnalysis.engagement.avg_like_rate,
      ],
      [
        Number(currentAnalysis.commentRate.toFixed(2)),
        refAnalysis.engagement.avg_comment_rate,
      ],
      [
        currentAnalysis.longestVideo?.videoId,
        videoId(refAnalysis.longest_videos[0].url),
      ],
      [
        currentAnalysis.shortestVideo?.videoId,
        videoId(refAnalysis.shortest_videos[0].url),
      ],
      [
        currentAnalysis.topByViews[0]?.videoId,
        videoId(refAnalysis.top_videos_by_views[0].url),
      ],
    ])
  );
  comparisons.push(
    comparison('youtube-channel-keywords', [
      [currentChannel.title, refKeywords.title],
      [currentChannel.customUrl, refKeywords.custom_url],
      [currentChannel.thumbnailUrl, refKeywords.thumbnail],
      [currentChannel.country, refKeywords.country],
      [currentChannel.channelId, refKeywords.channel_id],
      [currentChannel.keywords.join('\n'), refKeywords.keywords.join('\n')],
      [currentChannel.rawKeywords, refKeywords.raw_keywords],
    ])
  );
  comparisons.push(
    comparison('youtube-channel-banner-and-logo-downloader', [
      [currentChannel.title, refAssets.title],
      [currentChannel.customUrl, refAssets.custom_url],
      [currentChannel.channelId, refAssets.channel_id],
      ...Object.keys(refAssets.logos).map(
        (key) =>
          [currentChannel.logos[key], refAssets.logos[key]] as [
            unknown,
            unknown,
          ]
      ),
      ...Object.keys(refAssets.banners).map(
        (key) =>
          [currentChannel.banners[key], refAssets.banners[key]] as [
            unknown,
            unknown,
          ]
      ),
    ])
  );

  const totalMatched = comparisons.reduce(
    (total, item) => total + item.matched,
    0
  );
  const totalCompared = comparisons.reduce(
    (total, item) => total + item.compared,
    0
  );
  const report = {
    fixtureDirectory,
    playlistFixtures: {
      reference: playlistReferencePath,
      current: playlistCurrentPath,
    },
    generatedAt: new Date().toISOString(),
    tools: comparisons,
    summary: {
      matched: totalMatched,
      compared: totalCompared,
      rate: Number(((totalMatched / totalCompared) * 100).toFixed(2)),
      threshold: 95,
      passed:
        comparisons.every((item) => item.rate >= 95) &&
        totalMatched / totalCompared >= 0.95,
    },
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

await main();
