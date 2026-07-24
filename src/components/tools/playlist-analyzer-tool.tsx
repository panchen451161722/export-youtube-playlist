import { useMemo, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Activity,
  Clock3,
  Download,
  ExternalLink,
  LoaderCircle,
  PlayCircle,
  Users,
} from 'lucide-react';

import { apiPost } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { createPlaylistAnalyzerCsv } from './playlist-tool-csv';
import {
  analyzePlaylist,
  formatDurationClock,
  isValidYouTubePlaylistUrl,
} from './playlist-tool-utils';
import type { PlaylistExport, PlaylistVideo } from './types';

export type PlaylistAnalyzerLabels = {
  formTitle: string;
  formDescription: string;
  urlLabel: string;
  urlPlaceholder: string;
  urlHelper: string;
  submit: string;
  loading: string;
  invalidUrl: string;
  configurationError: string;
  unavailableError: string;
  quotaError: string;
  timeoutError: string;
  rateLimitError: string;
  networkError: string;
  emptyResult: string;
  resultsTitle: (playlistTitle: string) => string;
  returnedVideos: (count: number) => string;
  truncatedNotice: (limit: number) => string;
  metricsHeading: string;
  videoCount: string;
  totalDuration: string;
  averageDuration: string;
  uniqueChannels: string;
  totalViews: string;
  averageViews: string;
  totalLikes: string;
  averageLikes: string;
  totalComments: string;
  averageComments: string;
  statisticsAvailability: (available: number, total: number) => string;
  watchTimeHeading: string;
  normalSpeed: string;
  speed125: string;
  speed15: string;
  speed2: string;
  detailsHeading: string;
  longestVideo: string;
  shortestVideo: string;
  mostViewedVideos: string;
  topChannels: string;
  noStatistics: string;
  missing: string;
  views: (count: string) => string;
  channelVideos: (count: number) => string;
  videoDetail: (channel: string, duration: string) => string;
  downloadCsv: string;
  fileFallback: string;
};

export type PlaylistAnalyzerToolProps = {
  labels: PlaylistAnalyzerLabels;
  locale?: string;
};

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
};

function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <div className="border-border bg-background rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
        {value}
      </p>
      {detail ? (
        <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
      ) : null}
    </div>
  );
}

type VideoSummaryProps = {
  heading: string;
  video: PlaylistVideo | null;
  missing: string;
  detail: (channel: string, duration: string) => string;
};

function VideoSummary({ heading, video, missing, detail }: VideoSummaryProps) {
  return (
    <div className="border-border bg-background rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {heading}
      </p>
      {video ? (
        <>
          <a
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className="text-foreground mt-2 inline-flex max-w-full items-start gap-1.5 font-medium hover:underline"
          >
            <span className="line-clamp-2">{video.title}</span>
            <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          </a>
          <p className="text-muted-foreground mt-1 text-xs">
            {detail(video.channelTitle, video.duration)}
          </p>
        </>
      ) : (
        <p className="text-muted-foreground mt-2">{missing}</p>
      )}
    </div>
  );
}

function getErrorMessage(message: string, labels: PlaylistAnalyzerLabels) {
  const normalized = message.toLowerCase();
  if (normalized.includes('youtube_api_key_missing')) {
    return labels.configurationError;
  }
  if (
    normalized.includes('playlist_not_found') ||
    normalized.includes('private')
  ) {
    return labels.unavailableError;
  }
  if (normalized.includes('quota_exceeded')) {
    return labels.quotaError;
  }
  if (normalized.includes('request_timeout')) {
    return labels.timeoutError;
  }
  if (normalized.includes('please wait') || normalized.includes('rate')) {
    return labels.rateLimitError;
  }
  return labels.networkError;
}

function safeFileName(value: string, fallback: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return normalized || fallback;
}

function downloadCsv(content: string, name: string) {
  const blob = new Blob([`\uFEFF${content}`], {
    type: 'text/csv;charset=utf-8',
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = name;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }, 1_000);
}

export function PlaylistAnalyzerTool({
  labels,
  locale = 'en',
}: PlaylistAnalyzerToolProps) {
  const [url, setUrl] = useState('');
  const [clientError, setClientError] = useState('');
  const mutation = useMutation({
    mutationFn: (playlistUrl: string) =>
      apiPost<PlaylistExport>('/api/youtube-playlist', { url: playlistUrl }),
  });

  const analysis = useMemo(
    () => (mutation.data ? analyzePlaylist(mutation.data.videos) : null),
    [mutation.data]
  );
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
      }),
    [locale]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidYouTubePlaylistUrl(url)) {
      setClientError(labels.invalidUrl);
      return;
    }

    setClientError('');
    mutation.mutate(url.trim());
  };

  const error = clientError
    ? clientError
    : mutation.error instanceof Error
      ? getErrorMessage(mutation.error.message, labels)
      : '';

  const formatNumber = (value: number | null) =>
    value === null ? labels.missing : numberFormatter.format(value);
  const formatDuration = (value: number | null) =>
    value === null ? labels.missing : formatDurationClock(value);
  const handleDownloadCsv = () => {
    if (!mutation.data) return;
    const fileName = safeFileName(mutation.data.title, labels.fileFallback);
    downloadCsv(
      createPlaylistAnalyzerCsv(mutation.data),
      `${fileName}-analysis.csv`
    );
  };

  const metricCards =
    analysis === null
      ? []
      : [
          {
            label: labels.videoCount,
            value: numberFormatter.format(analysis.videoCount),
          },
          {
            label: labels.totalDuration,
            value: formatDuration(analysis.duration.total),
            detail: labels.statisticsAvailability(
              analysis.duration.available,
              analysis.videoCount
            ),
          },
          {
            label: labels.averageDuration,
            value: formatDuration(analysis.duration.average),
            detail: labels.statisticsAvailability(
              analysis.duration.available,
              analysis.videoCount
            ),
          },
          {
            label: labels.uniqueChannels,
            value: numberFormatter.format(analysis.uniqueChannelCount),
          },
          {
            label: labels.totalViews,
            value: formatNumber(analysis.views.total),
            detail: labels.statisticsAvailability(
              analysis.views.available,
              analysis.videoCount
            ),
          },
          {
            label: labels.averageViews,
            value: formatNumber(analysis.views.average),
            detail: labels.statisticsAvailability(
              analysis.views.available,
              analysis.videoCount
            ),
          },
          {
            label: labels.totalLikes,
            value: formatNumber(analysis.likes.total),
            detail: labels.statisticsAvailability(
              analysis.likes.available,
              analysis.videoCount
            ),
          },
          {
            label: labels.averageLikes,
            value: formatNumber(analysis.likes.average),
            detail: labels.statisticsAvailability(
              analysis.likes.available,
              analysis.videoCount
            ),
          },
          {
            label: labels.totalComments,
            value: formatNumber(analysis.comments.total),
            detail: labels.statisticsAvailability(
              analysis.comments.available,
              analysis.videoCount
            ),
          },
          {
            label: labels.averageComments,
            value: formatNumber(analysis.comments.average),
            detail: labels.statisticsAvailability(
              analysis.comments.available,
              analysis.videoCount
            ),
          },
        ];

  const watchTimes =
    analysis === null
      ? []
      : ([
          [labels.normalSpeed, analysis.watchTimes.normal],
          [labels.speed125, analysis.watchTimes.speed125],
          [labels.speed15, analysis.watchTimes.speed15],
          [labels.speed2, analysis.watchTimes.speed2],
        ] as const);

  return (
    <div className="space-y-6">
      <div className="border-border bg-card rounded-2xl border p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-lg">
            <Activity className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-foreground text-lg font-semibold">
              {labels.formTitle}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {labels.formDescription}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          <label
            htmlFor="playlist-analyzer-url"
            className="text-foreground text-sm font-medium"
          >
            {labels.urlLabel}
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Input
              id="playlist-analyzer-url"
              name="playlist-analyzer-url"
              type="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (clientError) setClientError('');
              }}
              placeholder={labels.urlPlaceholder}
              aria-describedby="playlist-analyzer-helper playlist-analyzer-error"
              aria-invalid={Boolean(error)}
              disabled={mutation.isPending}
              className="bg-background h-11 flex-1 px-3"
            />
            <Button
              type="submit"
              size="lg"
              disabled={mutation.isPending}
              className="h-11 sm:min-w-32"
            >
              {mutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : null}
              {mutation.isPending ? labels.loading : labels.submit}
            </Button>
          </div>
          <p
            id="playlist-analyzer-helper"
            className="text-muted-foreground mt-2 text-xs"
          >
            {labels.urlHelper}
          </p>
          <div
            id="playlist-analyzer-error"
            aria-live="polite"
            className="text-destructive mt-2 min-h-5 text-sm"
          >
            {error}
          </div>
        </form>
      </div>

      {mutation.data && analysis ? (
        <section
          className="border-border bg-card rounded-2xl border p-5 sm:p-7"
          aria-live="polite"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-foreground text-xl font-semibold">
                {labels.resultsTitle(mutation.data.title)}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {labels.returnedVideos(mutation.data.returnedItems)}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadCsv}
              >
                <Download aria-hidden />
                {labels.downloadCsv}
              </Button>
              {mutation.data.truncated ? (
                <p className="border-border bg-secondary text-secondary-foreground rounded-lg border px-3 py-2 text-xs">
                  {labels.truncatedNotice(mutation.data.limit)}
                </p>
              ) : null}
            </div>
          </div>

          {analysis.videoCount === 0 ? (
            <p className="text-muted-foreground mt-6">{labels.emptyResult}</p>
          ) : (
            <>
              <div className="mt-8 flex items-center gap-2">
                <Activity
                  className="text-muted-foreground size-4"
                  aria-hidden
                />
                <h3 className="text-foreground font-semibold">
                  {labels.metricsHeading}
                </h3>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {metricCards.map((metric) => (
                  <MetricCard key={metric.label} {...metric} />
                ))}
              </div>

              <div className="mt-8 flex items-center gap-2">
                <PlayCircle
                  className="text-muted-foreground size-4"
                  aria-hidden
                />
                <h3 className="text-foreground font-semibold">
                  {labels.watchTimeHeading}
                </h3>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {watchTimes.map(([label, seconds]) => (
                  <MetricCard
                    key={label}
                    label={label}
                    value={formatDuration(seconds)}
                  />
                ))}
              </div>

              <div className="mt-8 flex items-center gap-2">
                <Clock3 className="text-muted-foreground size-4" aria-hidden />
                <h3 className="text-foreground font-semibold">
                  {labels.detailsHeading}
                </h3>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <VideoSummary
                  heading={labels.longestVideo}
                  video={analysis.longestVideo}
                  missing={labels.missing}
                  detail={labels.videoDetail}
                />
                <VideoSummary
                  heading={labels.shortestVideo}
                  video={analysis.shortestVideo}
                  missing={labels.missing}
                  detail={labels.videoDetail}
                />
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-foreground font-semibold">
                    {labels.mostViewedVideos}
                  </h3>
                  {analysis.topVideosByViews.length > 0 ? (
                    <ol className="border-border mt-3 divide-y rounded-xl border">
                      {analysis.topVideosByViews.map(
                        ({ video, value }, index) => (
                          <li
                            key={video.videoId}
                            className="flex items-start gap-3 p-3"
                          >
                            <span className="bg-secondary text-secondary-foreground grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-foreground inline-flex max-w-full items-start gap-1.5 font-medium hover:underline"
                              >
                                <span className="line-clamp-2">
                                  {video.title}
                                </span>
                                <ExternalLink
                                  className="mt-0.5 size-3.5 shrink-0"
                                  aria-hidden
                                />
                              </a>
                              <p className="text-muted-foreground mt-1 text-xs">
                                {labels.views(numberFormatter.format(value))}
                              </p>
                            </div>
                          </li>
                        )
                      )}
                    </ol>
                  ) : (
                    <p className="text-muted-foreground mt-3 text-sm">
                      {labels.noStatistics}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Users
                      className="text-muted-foreground size-4"
                      aria-hidden
                    />
                    <h3 className="text-foreground font-semibold">
                      {labels.topChannels}
                    </h3>
                  </div>
                  {analysis.topChannels.length > 0 ? (
                    <ol className="border-border mt-3 divide-y rounded-xl border">
                      {analysis.topChannels.map((channel, index) => (
                        <li
                          key={channel.channelTitle}
                          className="flex items-center gap-3 p-3"
                        >
                          <span className="bg-secondary text-secondary-foreground grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold">
                            {index + 1}
                          </span>
                          <span className="text-foreground min-w-0 flex-1 truncate font-medium">
                            {channel.channelTitle}
                          </span>
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {labels.channelVideos(channel.videoCount)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-muted-foreground mt-3 text-sm">
                      {labels.noStatistics}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
