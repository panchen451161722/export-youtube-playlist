import { useMemo, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Check,
  Clipboard,
  Download,
  ExternalLink,
  LoaderCircle,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  channelVideosToExportRecords,
  downloadYouTubeExports,
  triggerExportConfetti,
  YOUTUBE_EXPORT_FORMATS,
  type YouTubeExportFormat,
} from '@/lib/youtube-export';
import { ExportFormatPicker } from '@/components/export-format-picker';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  analyzeChannelVideos,
  formatSeconds,
  sortChannelVideos,
  type ChannelVideoSort,
} from './channel-tool-utils';
import {
  copyText,
  createChannelAnalyzerCsv,
  createChannelLinksCsv,
  createChannelPlaylistsCsv,
  createChannelTitlesCsv,
  downloadText,
  safeFileName,
} from './public-tool-export';
import type { ChannelMediaType, ChannelToolData, ChannelVideo } from './types';

export type ChannelUtilityMode =
  | 'id'
  | 'playlist'
  | 'subscribe'
  | 'playlists'
  | 'links'
  | 'titles'
  | 'export'
  | 'analyzer'
  | 'keywords'
  | 'assets';

export type ChannelUtilityLabels = {
  inputLabel: string;
  inputPlaceholder: string;
  inputHelper: string;
  submit: string;
  loading: string;
  error: string;
  results: string;
  copy: string;
  copied: string;
  downloadCsv: string;
  downloadXlsx: string;
  downloadTxt: string;
  open: string;
  channelId: string;
  channelName: string;
  handle: string;
  country: string;
  playlistUrl: string;
  playlistId: string;
  subscribeUrl: string;
  mediaType: string;
  allUploads: string;
  videosOnly: string;
  shortsOnly: string;
  liveOnly: string;
  sort: string;
  sortOriginal: string;
  sortNewest: string;
  sortOldest: string;
  sortViews: string;
  sortLikes: string;
  sortComments: string;
  sortLongest: string;
  sortShortest: string;
  sortAz: string;
  sortZa: string;
  search: string;
  count: string;
  noData: string;
  totalUploads: string;
  totalDuration: string;
  averageDuration: string;
  totalViews: string;
  averageViews: string;
  totalLikes: string;
  totalComments: string;
  engagementRate: string;
  formats: string;
  topVideos: string;
  keywords: string;
  copyHashtags: string;
  logos: string;
  banners: string;
  videoCount: string;
  chooseFormats: string;
  defaultFormats: string;
  downloadSuccess: string;
  downloadSelected: string;
};

type Props = {
  mode: ChannelUtilityMode;
  labels: ChannelUtilityLabels;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (error.message.startsWith('export_generation_failed:')) {
    const formatKey = error.message.split(':')[1] as YouTubeExportFormat;
    const format = YOUTUBE_EXPORT_FORMATS.find(
      (item) => item.key === formatKey
    );
    return format ? `${fallback} (${format.label})` : fallback;
  }
  if (error.message.includes('youtube_api_key_missing')) {
    return 'The YouTube API key is not configured yet.';
  }
  if (error.message.includes('quota_exceeded')) {
    return 'The YouTube API quota is temporarily exhausted. Please try again later.';
  }
  if (error.message.includes('request_timeout')) {
    return 'YouTube took too long to respond. Please try again.';
  }
  return fallback;
}

function number(value: string) {
  return /^\d+$/.test(value) ? Number(value) : 0;
}

function ProfileHeader({
  data,
  labels,
}: {
  data: ChannelToolData;
  labels: ChannelUtilityLabels;
}) {
  return (
    <div className="flex items-start gap-4">
      {data.thumbnailUrl ? (
        <img
          src={data.thumbnailUrl}
          alt=""
          className="border-border size-20 rounded-full border object-cover"
        />
      ) : null}
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {labels.results}
        </p>
        <h2 className="text-foreground mt-1 text-xl font-semibold">
          {data.title}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {[data.customUrl, data.channelId, data.country]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-border bg-background rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function VideoRows({
  videos,
  value,
}: {
  videos: ChannelVideo[];
  value: 'url' | 'title';
}) {
  return (
    <ol className="border-border mt-4 max-h-[40rem] divide-y overflow-auto rounded-xl border">
      {videos.map((video, index) => (
        <li key={video.videoId} className="flex items-start gap-3 p-3">
          <span className="bg-secondary text-secondary-foreground grid size-7 shrink-0 place-items-center rounded-md text-xs font-semibold">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-foreground break-words">
              {value === 'url' ? video.url : video.title}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {video.duration} · {video.viewCount || '0'} views
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ChannelUtilityTool({ mode, labels }: Props) {
  const [url, setUrl] = useState('');
  const [mediaType, setMediaType] = useState<ChannelMediaType>('all');
  const [sort, setSort] = useState<ChannelVideoSort>('original');
  const [query, setQuery] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<YouTubeExportFormat[]>(
    []
  );
  const [exportingFiles, setExportingFiles] = useState(false);

  const includeVideos = ['links', 'titles', 'export', 'analyzer'].includes(
    mode
  );
  const includePlaylists = mode === 'playlists';
  const showMediaType = includeVideos;
  const showSort = ['links', 'titles', 'export'].includes(mode);

  const mutation = useMutation({
    mutationFn: async (channelUrl: string) => {
      const result = await apiPost<ChannelToolData>('/api/youtube-channel', {
        url: channelUrl,
        includeVideos,
        includePlaylists,
        mediaType,
        limit: 5_000,
      });
      if (mode === 'export') {
        await downloadYouTubeExports({
          records: channelVideosToExportRecords(result.videos),
          context: { title: result.title, source: 'channel' },
          formats: selectedFormats,
        });
      }
      return result;
    },
    onSuccess: () => {
      if (mode === 'export') {
        triggerExportConfetti();
        toast.success(labels.downloadSuccess);
      }
    },
  });

  const sortedVideos = useMemo(
    () => sortChannelVideos(mutation.data?.videos ?? [], sort),
    [mutation.data?.videos, sort]
  );
  const analysis = useMemo(
    () => (mutation.data ? analyzeChannelVideos(mutation.data.videos) : null),
    [mutation.data]
  );
  const visiblePlaylists = useMemo(() => {
    const playlists = (mutation.data?.playlists ?? []).filter((playlist) =>
      playlist.title.toLowerCase().includes(query.trim().toLowerCase())
    );
    if (sort === 'title-az') {
      return [...playlists].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sort === 'title-za') {
      return [...playlists].sort((a, b) => b.title.localeCompare(a.title));
    }
    if (sort === 'views') {
      return [...playlists].sort((a, b) => b.videoCount - a.videoCount);
    }
    if (sort === 'shortest') {
      return [...playlists].sort((a, b) => a.videoCount - b.videoCount);
    }
    return playlists;
  }, [mutation.data?.playlists, query, sort]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCopyStatus('');
    if (!url.trim()) return;
    mutation.mutate(url.trim());
  };

  const copy = async (value: string, status: string) => {
    try {
      await copyText(value);
      setCopyStatus(status);
      window.setTimeout(() => setCopyStatus(''), 2_000);
    } catch {
      setCopyStatus('');
    }
  };

  const fileBase = mutation.data
    ? safeFileName(mutation.data.title, 'youtube-channel')
    : 'youtube-channel';
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
      value
    );

  const handleCsv = () => {
    if (!mutation.data) return;
    const csv =
      mode === 'links'
        ? createChannelLinksCsv(sortedVideos)
        : mode === 'titles'
          ? createChannelTitlesCsv(sortedVideos)
          : mode === 'playlists'
            ? createChannelPlaylistsCsv(visiblePlaylists)
            : mode === 'analyzer'
              ? createChannelAnalyzerCsv(mutation.data.videos)
              : '';
    if (!csv) return;
    downloadText(csv, `${fileBase}-${mode}.csv`, 'text/csv');
  };

  const handleSelectedExport = async () => {
    if (!mutation.data || exportingFiles) return;
    setExportingFiles(true);
    try {
      await downloadYouTubeExports({
        records: channelVideosToExportRecords(sortedVideos),
        context: { title: mutation.data.title, source: 'channel' },
        formats: selectedFormats,
      });
      triggerExportConfetti();
      toast.success(labels.downloadSuccess);
    } catch (error) {
      toast.error(getErrorMessage(error, labels.error));
    } finally {
      setExportingFiles(false);
    }
  };

  const error = getErrorMessage(mutation.error, labels.error);

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="border-border bg-card rounded-2xl border p-5 sm:p-7"
      >
        <label
          htmlFor={`channel-tool-${mode}`}
          className="text-foreground text-sm font-medium"
        >
          {labels.inputLabel}
        </label>
        <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Input
            id={`channel-tool-${mode}`}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={labels.inputPlaceholder}
            disabled={mutation.isPending}
            className="bg-background h-11"
          />
          {showMediaType ? (
            <label className="sr-only" htmlFor={`media-${mode}`}>
              {labels.mediaType}
            </label>
          ) : null}
          {showMediaType ? (
            <select
              id={`media-${mode}`}
              value={mediaType}
              onChange={(event) =>
                setMediaType(event.target.value as ChannelMediaType)
              }
              disabled={mutation.isPending}
              className="border-input bg-background h-11 rounded-md border px-3 text-sm"
            >
              <option value="all">{labels.allUploads}</option>
              <option value="videos">{labels.videosOnly}</option>
              <option value="shorts">{labels.shortsOnly}</option>
              <option value="live">{labels.liveOnly}</option>
            </select>
          ) : null}
          <Button
            type="submit"
            disabled={mutation.isPending || exportingFiles || !url.trim()}
            className="h-11 min-w-36"
          >
            {mutation.isPending ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Search aria-hidden />
            )}
            {mutation.isPending ? labels.loading : labels.submit}
          </Button>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          {labels.inputHelper}
        </p>
        {mode === 'export' ? (
          <fieldset className="mt-6">
            <legend className="text-foreground text-sm font-medium">
              {labels.chooseFormats}
            </legend>
            <div className="mt-3">
              <ExportFormatPicker
                selected={selectedFormats}
                onChange={setSelectedFormats}
                disabled={mutation.isPending || exportingFiles}
              />
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              {labels.defaultFormats}
            </p>
          </fieldset>
        ) : null}
        {mutation.error ? (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {error}
          </p>
        ) : null}
      </form>

      {mutation.data ? (
        <section className="border-border bg-card rounded-2xl border p-5 sm:p-7">
          <ProfileHeader data={mutation.data} labels={labels} />

          {mode === 'id' ? (
            <dl className="mt-7 grid gap-4 md:grid-cols-2">
              {[
                [labels.channelId, mutation.data.channelId],
                [labels.handle, mutation.data.customUrl || labels.noData],
                [labels.country, mutation.data.country || labels.noData],
                [labels.channelName, mutation.data.title],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-border bg-background rounded-xl border p-4"
                >
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="mt-2 flex items-center justify-between gap-3 font-mono text-sm break-all">
                    {value}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => copy(value, label)}
                    >
                      {copyStatus === label ? <Check /> : <Clipboard />}
                      <span className="sr-only">{labels.copy}</span>
                    </Button>
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {mode === 'playlist' ? (
            <dl className="mt-7 space-y-4">
              {[
                [labels.playlistUrl, mutation.data.uploadsPlaylistUrl],
                [labels.playlistId, mutation.data.uploadsPlaylistId],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-border bg-background rounded-xl border p-4"
                >
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <span className="font-mono text-sm break-all">{value}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copy(value, label)}
                    >
                      {copyStatus === label ? <Check /> : <Clipboard />}
                      {copyStatus === label ? labels.copied : labels.copy}
                    </Button>
                  </dd>
                </div>
              ))}
              <a
                href={mutation.data.uploadsPlaylistUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                <ExternalLink />
                {labels.open}
              </a>
            </dl>
          ) : null}

          {mode === 'subscribe' ? (
            <div className="border-border bg-background mt-7 rounded-xl border p-5">
              <p className="text-muted-foreground text-xs">
                {labels.subscribeUrl}
              </p>
              <p className="mt-2 font-mono text-sm break-all">
                {mutation.data.subscribeUrl}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    copy(mutation.data?.subscribeUrl ?? '', 'subscribe')
                  }
                >
                  {copyStatus === 'subscribe' ? <Check /> : <Clipboard />}
                  {copyStatus === 'subscribe' ? labels.copied : labels.copy}
                </Button>
                <a
                  href={mutation.data.subscribeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: 'outline' }))}
                >
                  <ExternalLink />
                  {labels.open}
                </a>
              </div>
            </div>
          ) : null}

          {mode === 'keywords' ? (
            <div className="mt-7 space-y-5">
              <div className="flex flex-wrap gap-2">
                {mutation.data.keywords.length ? (
                  mutation.data.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="bg-secondary text-secondary-foreground rounded-full px-3 py-1.5 text-sm"
                    >
                      {keyword}
                    </span>
                  ))
                ) : (
                  <p className="text-muted-foreground">{labels.noData}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!mutation.data.keywords.length}
                  onClick={() =>
                    copy(mutation.data?.keywords.join(', ') ?? '', 'keywords')
                  }
                >
                  {copyStatus === 'keywords' ? <Check /> : <Clipboard />}
                  {copyStatus === 'keywords' ? labels.copied : labels.copy}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!mutation.data.keywords.length}
                  onClick={() =>
                    copy(
                      mutation.data?.keywords
                        .map((keyword) => `#${keyword}`)
                        .join(', ') ?? '',
                      'keyword-hashtags'
                    )
                  }
                >
                  {copyStatus === 'keyword-hashtags' ? (
                    <Check />
                  ) : (
                    <Clipboard />
                  )}
                  {copyStatus === 'keyword-hashtags'
                    ? labels.copied
                    : labels.copyHashtags}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!mutation.data.keywords.length}
                  onClick={() =>
                    downloadText(
                      mutation.data?.keywords.join('\r\n') ?? '',
                      `${fileBase}-keywords.txt`
                    )
                  }
                >
                  <Download />
                  {labels.downloadTxt}
                </Button>
              </div>
            </div>
          ) : null}

          {mode === 'assets' ? (
            <div className="mt-7 space-y-8">
              {[
                [labels.logos, mutation.data.logos],
                [labels.banners, mutation.data.banners],
              ].map(([label, assets]) => (
                <div key={String(label)}>
                  <h3 className="font-semibold">{String(label)}</h3>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {Object.entries(assets as Record<string, string>).map(
                      ([name, assetUrl]) => (
                        <article
                          key={name}
                          className="border-border bg-background overflow-hidden rounded-xl border"
                        >
                          <img
                            src={assetUrl}
                            alt={`${mutation.data?.title} ${name}`}
                            className="bg-muted aspect-video w-full object-contain"
                          />
                          <div className="flex items-center justify-between gap-3 p-4">
                            <p className="font-medium">{name}</p>
                            <a
                              href={assetUrl}
                              download={`${fileBase}-${name}.jpg`}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                buttonVariants({
                                  variant: 'outline',
                                  size: 'sm',
                                })
                              )}
                            >
                              <Download />
                              {labels.open}
                            </a>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {mode === 'playlists' ? (
            <div className="mt-7">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={labels.search}
                />
                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as ChannelVideoSort)
                  }
                  className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                >
                  <option value="original">{labels.sortOriginal}</option>
                  <option value="title-az">{labels.sortAz}</option>
                  <option value="title-za">{labels.sortZa}</option>
                  <option value="views">{labels.sortViews}</option>
                  <option value="shortest">{labels.sortShortest}</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCsv}
                  disabled={!visiblePlaylists.length}
                >
                  <Download />
                  {labels.downloadCsv}
                </Button>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                {labels.count}: {visiblePlaylists.length}
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {visiblePlaylists.map((playlist) => (
                  <article
                    key={playlist.playlistId}
                    className="border-border bg-background rounded-xl border p-4"
                  >
                    <div className="flex gap-3">
                      {playlist.thumbnailUrl ? (
                        <img
                          src={playlist.thumbnailUrl}
                          alt=""
                          className="h-20 w-32 rounded-md object-cover"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <h3 className="font-medium">{playlist.title}</h3>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {labels.videoCount}: {playlist.videoCount}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={playlist.url}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' })
                        )}
                      >
                        <ExternalLink />
                        {labels.open}
                      </a>
                      <Link
                        href={`/?playlist=${encodeURIComponent(playlist.url)}#exporter`}
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' })
                        )}
                      >
                        <Download />
                        {labels.downloadCsv}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {['links', 'titles', 'export'].includes(mode) ? (
            <div className="mt-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  {showSort ? (
                    <label className="text-sm">
                      <span className="font-medium">{labels.sort}</span>
                      <select
                        value={sort}
                        onChange={(event) =>
                          setSort(event.target.value as ChannelVideoSort)
                        }
                        className="border-input bg-background mt-2 block h-10 rounded-md border px-3"
                      >
                        <option value="original">{labels.sortOriginal}</option>
                        <option value="newest">{labels.sortNewest}</option>
                        <option value="oldest">{labels.sortOldest}</option>
                        <option value="views">{labels.sortViews}</option>
                        <option value="likes">{labels.sortLikes}</option>
                        <option value="comments">{labels.sortComments}</option>
                        <option value="longest">{labels.sortLongest}</option>
                        <option value="shortest">{labels.sortShortest}</option>
                      </select>
                    </label>
                  ) : null}
                  <p className="text-muted-foreground pb-2 text-sm">
                    {labels.count}: {sortedVideos.length}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mode !== 'export' ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        copy(
                          sortedVideos
                            .map((video) =>
                              mode === 'links' ? video.url : video.title
                            )
                            .join('\r\n'),
                          'videos'
                        )
                      }
                      disabled={!sortedVideos.length}
                    >
                      {copyStatus === 'videos' ? <Check /> : <Clipboard />}
                      {copyStatus === 'videos' ? labels.copied : labels.copy}
                    </Button>
                  ) : null}
                  {mode === 'export' ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSelectedExport}
                      disabled={!sortedVideos.length || exportingFiles}
                    >
                      {exportingFiles ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Download />
                      )}
                      {labels.downloadSelected}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCsv}
                      disabled={!sortedVideos.length}
                    >
                      <Download />
                      {labels.downloadCsv}
                    </Button>
                  )}
                </div>
              </div>
              {mode === 'links' || mode === 'titles' ? (
                <VideoRows
                  videos={sortedVideos}
                  value={mode === 'links' ? 'url' : 'title'}
                />
              ) : (
                <div className="border-border bg-muted/30 text-muted-foreground mt-4 rounded-xl border p-5 text-sm">
                  {labels.formats}:{' '}
                  {mode === 'export'
                    ? `${YOUTUBE_EXPORT_FORMATS.length} formats`
                    : 'CSV'}{' '}
                  · {sortedVideos.length} {labels.count.toLowerCase()}
                </div>
              )}
            </div>
          ) : null}

          {mode === 'analyzer' && analysis ? (
            <div className="mt-7 space-y-8">
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={handleCsv}>
                  <Download />
                  {labels.downloadCsv}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  label={labels.totalUploads}
                  value={analysis.videoCount}
                />
                <Metric
                  label={labels.totalDuration}
                  value={formatSeconds(analysis.totalDuration)}
                />
                <Metric
                  label={labels.averageDuration}
                  value={formatSeconds(analysis.averageDuration)}
                />
                <Metric
                  label={labels.totalViews}
                  value={formatNumber(analysis.totalViews)}
                />
                <Metric
                  label={labels.averageViews}
                  value={formatNumber(analysis.averageViews)}
                />
                <Metric
                  label={labels.totalLikes}
                  value={formatNumber(analysis.totalLikes)}
                />
                <Metric
                  label={labels.totalComments}
                  value={formatNumber(analysis.totalComments)}
                />
                <Metric
                  label={labels.engagementRate}
                  value={`${analysis.engagementRate.toFixed(2)}%`}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label={labels.videosOnly}
                  value={analysis.videosCount}
                />
                <Metric
                  label={labels.shortsOnly}
                  value={analysis.shortsCount}
                />
                <Metric label={labels.liveOnly} value={analysis.liveCount} />
              </div>
              <div>
                <h3 className="font-semibold">{labels.topVideos}</h3>
                <ol className="border-border mt-3 divide-y rounded-xl border">
                  {analysis.topByViews.slice(0, 5).map((video, index) => (
                    <li
                      key={video.videoId}
                      className="flex items-start gap-3 p-3"
                    >
                      <span className="bg-secondary text-secondary-foreground grid size-7 shrink-0 place-items-center rounded-md text-xs font-semibold">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium hover:underline"
                        >
                          {video.title}
                        </a>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {formatNumber(number(video.viewCount))}{' '}
                          {labels.totalViews.toLowerCase()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
