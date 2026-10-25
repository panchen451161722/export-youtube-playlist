import { useId, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  Check,
  Clipboard,
  Download,
  LoaderCircle,
  Search,
} from 'lucide-react';

import { trackEvent } from '@/lib/analytics';
import { apiPost } from '@/lib/api-client';
import { clarityErrorType, resultSizeBucket } from '@/lib/clarity';
import { getYouTubeInputAlternative } from '@/lib/youtube-input-alternative';
import { isUnavailablePlaylistError } from '@/lib/youtube-playlist-error';
import { usePlaylistExportAccess } from '@/hooks/use-playlist-export-access';
import {
  ExportBackupCta,
  type ExportBackupContent,
} from '@/components/export-backup-cta';
import {
  InputToolRecommendation,
  type InputToolRecommendationContent,
} from '@/components/tools/input-tool-recommendation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { createPlaylistExtractionCsv } from './playlist-tool-csv';
import type { PlaylistExport, PlaylistVideo } from './types';

export type PlaylistExtractionMode = 'links' | 'titles';

export interface PlaylistExtractionToolLabels {
  inputLabel: string;
  inputPlaceholder: string;
  inputHelper: string;
  submit: string;
  loading: string;
  formatLegend: string;
  linksOnly: string;
  titleAndLink: string;
  plainTitles: string;
  numberedTitles: string;
  resultsHeading: string;
  resultSummary: string;
  truncated: string;
  empty: string;
  copyAll: string;
  copySuccess: string;
  copyError: string;
  downloadTxt: string;
  downloadCsv: string;
  invalidUrl: string;
  errorPrivate: string;
  errorQuota: string;
  errorTimeout: string;
  errorConfiguration: string;
  errorRateLimit: string;
  errorNetwork: string;
  resultsListLabel: string;
  fileFallback: string;
}

export interface PlaylistExtractionToolProps {
  mode: PlaylistExtractionMode;
  labels: PlaylistExtractionToolLabels;
  backupContent?: ExportBackupContent;
  recommendationContent?: InputToolRecommendationContent;
}

type ExtractionFormat =
  | 'links-only'
  | 'title-and-link'
  | 'plain-titles'
  | 'numbered-titles';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

function isValidPlaylistUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const playlistId = url.searchParams.get('list') ?? '';
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      YOUTUBE_HOSTS.has(url.hostname.toLowerCase().replace(/\.$/, '')) &&
      /^[A-Za-z0-9_-]{10,128}$/.test(playlistId)
    );
  } catch {
    return false;
  }
}

function canonicalVideoUrl(video: PlaylistVideo) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`;
}

function formatResultText(result: PlaylistExport, format: ExtractionFormat) {
  return result.videos
    .map((video) => {
      if (format === 'links-only') return canonicalVideoUrl(video);
      if (format === 'title-and-link') {
        return `${video.title}\t${canonicalVideoUrl(video)}`;
      }
      if (format === 'numbered-titles') {
        return `${video.position}. ${video.title}`;
      }
      return video.title;
    })
    .join('\r\n');
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

function downloadText(content: string, type: string, name: string) {
  const blob = new Blob([`\uFEFF${content}`], {
    type: `${type};charset=utf-8`,
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

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('copy_failed');
}

function getErrorCopy(message: string, labels: PlaylistExtractionToolLabels) {
  if (
    message.includes('invalid_playlist_url') ||
    message.includes('valid YouTube playlist URL')
  ) {
    return labels.invalidUrl;
  }
  if (
    message.includes('playlist_not_found') ||
    message.includes('private, deleted')
  ) {
    return labels.errorPrivate;
  }
  if (message.includes('quota_exceeded')) return labels.errorQuota;
  if (message.includes('request_timeout')) return labels.errorTimeout;
  if (message.includes('youtube_api_key_missing')) {
    return labels.errorConfiguration;
  }
  if (
    message.toLowerCase().includes('wait before') ||
    message.toLowerCase().includes('too many requests')
  ) {
    return labels.errorRateLimit;
  }
  return labels.errorNetwork;
}

function replaceResultTokens(template: string, result: PlaylistExport): string {
  return template
    .replaceAll('{playlist}', result.title)
    .replaceAll('{count}', String(result.videos.length));
}

export function PlaylistExtractionTool({
  mode,
  labels,
  backupContent,
  recommendationContent,
}: PlaylistExtractionToolProps) {
  const access = usePlaylistExportAccess();
  const [downloaded, setDownloaded] = useState(false);
  const id = useId();
  const inputId = `${id}-playlist-url`;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const formatName = `${id}-format`;
  const [url, setUrl] = useState('');
  const [clientError, setClientError] = useState('');
  const alternative = recommendationContent
    ? getYouTubeInputAlternative(url)
    : null;
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>(
    'idle'
  );
  const [format, setFormat] = useState<ExtractionFormat>(
    mode === 'links' ? 'links-only' : 'plain-titles'
  );

  const mutation = useMutation({
    mutationFn: (playlistUrl: string) =>
      apiPost<PlaylistExport>('/api/youtube-playlist', {
        url: playlistUrl,
      }),
    onMutate: () => {
      setDownloaded(false);
      trackEvent('tool_run_started', {
        tool: `playlist_${mode}`,
        output_format: format,
      });
    },
    onSuccess: (data) => {
      trackEvent('tool_run_succeeded', {
        tool: `playlist_${mode}`,
        result_size: resultSizeBucket(data.videos.length),
        truncated: data.truncated,
      });
    },
    onError: (error) => {
      trackEvent('tool_run_failed', {
        tool: `playlist_${mode}`,
        error_type: clarityErrorType(error),
      });
    },
  });

  const resultText = useMemo(
    () => (mutation.data ? formatResultText(mutation.data, format) : ''),
    [format, mutation.data]
  );

  const error = clientError
    ? clientError
    : mutation.error instanceof Error
      ? getErrorCopy(mutation.error.message, labels)
      : '';

  const unavailablePlaylist =
    !!backupContent?.privatePlaylist &&
    !clientError &&
    mutation.isError &&
    isUnavailablePlaylistError(mutation.error) &&
    mutation.variables === url.trim();

  const formatOptions =
    mode === 'links'
      ? [
          { value: 'links-only' as const, label: labels.linksOnly },
          { value: 'title-and-link' as const, label: labels.titleAndLink },
        ]
      : [
          { value: 'plain-titles' as const, label: labels.plainTitles },
          {
            value: 'numbered-titles' as const,
            label: labels.numberedTitles,
          },
        ];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDownloaded(false);
    setCopyStatus('idle');
    if (alternative) return;
    if (!isValidPlaylistUrl(url)) {
      setClientError(labels.invalidUrl);
      trackEvent('tool_run_failed', {
        tool: `playlist_${mode}`,
        error_type: 'invalid_url',
      });
      return;
    }
    setClientError('');
    mutation.mutate(url.trim());
  };

  const handleCopy = async () => {
    try {
      await copyText(resultText);
      setCopyStatus('copied');
      trackEvent('result_copied', {
        tool: `playlist_${mode}`,
        output_format: format,
        result_size: resultSizeBucket(mutation.data?.videos.length ?? 0),
      });
      window.setTimeout(() => setCopyStatus('idle'), 2_500);
    } catch {
      setCopyStatus('error');
    }
  };

  const handleDownloadTxt = () => {
    if (!mutation.data) return;
    const fileName = safeFileName(mutation.data.title, labels.fileFallback);
    downloadText(resultText, 'text/plain', `${fileName}.txt`);
    setDownloaded(true);
    trackEvent('export_downloaded', {
      tool: `playlist_${mode}`,
      output_format: 'txt',
      result_size: resultSizeBucket(mutation.data.videos.length),
    });
  };

  const handleDownloadCsv = () => {
    if (!mutation.data) return;
    const fileName = safeFileName(mutation.data.title, labels.fileFallback);
    downloadText(
      createPlaylistExtractionCsv(mutation.data, mode),
      'text/csv',
      `${fileName}.csv`
    );
    setDownloaded(true);
    trackEvent('export_downloaded', {
      tool: `playlist_${mode}`,
      output_format: 'csv',
      result_size: resultSizeBucket(mutation.data.videos.length),
    });
  };

  return (
    <div className="border-border bg-card rounded-2xl border p-5 shadow-sm sm:p-7">
      <form onSubmit={handleSubmit}>
        <label
          htmlFor={inputId}
          className="text-foreground text-sm font-medium"
        >
          {labels.inputLabel}
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Input
            id={inputId}
            name="playlist-url"
            type="text"
            inputMode="url"
            value={url}
            disabled={mutation.isPending}
            onChange={(event) => {
              setUrl(event.target.value);
              if (clientError) setClientError('');
              mutation.reset();
              setDownloaded(false);
              setCopyStatus('idle');
            }}
            placeholder={labels.inputPlaceholder}
            aria-describedby={`${helperId}${error ? ` ${errorId}` : ''}${alternative ? ` ${id}-recommendation` : ''}`}
            aria-invalid={Boolean(error)}
            className="border-input bg-background h-11 flex-1 px-4 shadow-none"
          />
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-11 w-full px-5 shadow-none sm:w-auto"
          >
            {mutation.isPending ? (
              <>
                <LoaderCircle className="animate-spin" />
                {labels.loading}
              </>
            ) : (
              <>
                <Search />
                {labels.submit}
              </>
            )}
          </Button>
        </div>
        <p id={helperId} className="text-muted-foreground mt-2 text-xs">
          {labels.inputHelper}
        </p>

        {alternative && recommendationContent && (
          <InputToolRecommendation
            id={`${id}-recommendation`}
            alternative={alternative}
            content={recommendationContent}
          />
        )}
        <fieldset className="mt-6">
          <legend className="text-foreground text-sm font-medium">
            {labels.formatLegend}
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {formatOptions.map((option) => (
              <label
                key={option.value}
                className="border-border bg-background hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors"
              >
                <input
                  type="radio"
                  name={formatName}
                  value={option.value}
                  checked={format === option.value}
                  onChange={() => setFormat(option.value)}
                  className="border-input text-primary focus-visible:ring-ring size-4"
                />
                <span className="text-foreground font-medium">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>

      {error && !unavailablePlaylist ? (
        <div
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {unavailablePlaylist && mutation.variables && backupContent && (
        <ExportBackupCta
          key={`private-${mutation.submittedAt}`}
          content={backupContent}
          playlistUrl={mutation.variables}
          tool={`playlist_${mode}`}
          privatePlaylist
          errorId={errorId}
          subscribed={access.data?.subscribed}
        />
      )}

      {downloaded && mutation.data && backupContent && (
        <ExportBackupCta
          key={mutation.submittedAt}
          content={backupContent}
          playlistUrl={`https://www.youtube.com/playlist?list=${mutation.data.playlistId}`}
          tool={`playlist_${mode}`}
          partialExportCount={
            mutation.data.truncated ? mutation.data.videos.length : undefined
          }
        />
      )}
      {mutation.data ? (
        <section
          data-clarity-mask="true"
          className="border-border mt-7 border-t pt-6"
        >
          {mutation.data.videos.length ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-foreground text-lg font-semibold">
                    {labels.resultsHeading}
                  </h2>
                  <p
                    aria-live="polite"
                    className="text-muted-foreground mt-1 text-sm break-words"
                  >
                    {replaceResultTokens(labels.resultSummary, mutation.data)}
                  </p>
                </div>
                <div className="grid shrink-0 grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:flex">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopy}
                    className="w-full sm:w-auto"
                  >
                    {copyStatus === 'copied' ? <Check /> : <Clipboard />}
                    {copyStatus === 'copied'
                      ? labels.copySuccess
                      : labels.copyAll}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadTxt}
                    className="w-full sm:w-auto"
                  >
                    <Download />
                    {labels.downloadTxt}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadCsv}
                    className="w-full sm:w-auto"
                  >
                    <Download />
                    {labels.downloadCsv}
                  </Button>
                </div>
              </div>

              {copyStatus !== 'idle' ? (
                <p
                  aria-live="polite"
                  className={
                    copyStatus === 'error'
                      ? 'mt-3 text-sm text-red-700 dark:text-red-300'
                      : 'text-muted-foreground mt-3 text-sm'
                  }
                >
                  {copyStatus === 'copied'
                    ? labels.copySuccess
                    : labels.copyError}
                </p>
              ) : null}

              {mutation.data.truncated && !(downloaded && backupContent) ? (
                <p
                  role="status"
                  className="mt-3 text-xs text-amber-800 dark:text-amber-300"
                >
                  {labels.truncated}
                </p>
              ) : null}

              <pre
                aria-label={labels.resultsListLabel}
                className="border-border bg-muted/40 text-foreground mt-4 max-h-[32rem] overflow-auto rounded-xl border p-4 font-mono text-xs leading-6 break-all whitespace-pre-wrap sm:text-sm"
              >
                {resultText}
              </pre>
            </>
          ) : (
            <div
              role="status"
              aria-live="polite"
              className="border-border bg-muted/40 text-muted-foreground rounded-xl border p-5 text-sm"
            >
              {labels.empty}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
