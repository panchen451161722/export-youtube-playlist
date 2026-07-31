import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiPost } from '@/lib/api-client';
import {
  clarityErrorType,
  resultSizeBucket,
  trackClarityEvent,
} from '@/lib/clarity';
import {
  downloadYouTubeExports,
  playlistVideosToExportRecords,
  triggerExportConfetti,
  YOUTUBE_EXPORT_FORMATS,
  type YouTubeExportFormat,
} from '@/lib/youtube-export';
import { m } from '@/paraglide/messages.js';
import { ExportFormatPicker } from '@/components/export-format-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PlaylistVideo = {
  position: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  durationSeconds: number | null;
  durationMinutes: number | null;
  durationText: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  videoId: string;
  url: string;
  tags: string[];
  descriptionTags: string[];
  descriptionEmails: string[];
  descriptionLinks: string[];
};

type PlaylistResult = {
  playlistId: string;
  title: string;
  channelTitle: string;
  totalItems: number;
  returnedItems: number;
  truncated: boolean;
  videos: PlaylistVideo[];
};

const youtubeHosts = new Set([
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
      youtubeHosts.has(url.hostname.toLowerCase()) &&
      /^[A-Za-z0-9_-]{10,80}$/.test(playlistId)
    );
  } catch {
    return false;
  }
}

function getErrorCopy(message: string) {
  if (message.includes('youtube_api_key_missing')) {
    return m['landing.exporter.error.config']();
  }
  if (message.includes('playlist_not_found')) {
    return m['landing.exporter.error.private']();
  }
  if (message.includes('quota_exceeded')) {
    return m['landing.exporter.error.quota']();
  }
  if (message.includes('request_timeout')) {
    return m['landing.exporter.error.timeout']();
  }
  if (message.includes('export_generation_failed')) {
    const formatKey = message.split(':')[1] as YouTubeExportFormat | undefined;
    const format = YOUTUBE_EXPORT_FORMATS.find(
      (item) => item.key === formatKey
    );
    return format
      ? `${m['landing.exporter.error.export']()} (${format.label})`
      : m['landing.exporter.error.export']();
  }
  return m['landing.exporter.error.network']();
}

export function Hero() {
  const [url, setUrl] = useState('');
  const [clientError, setClientError] = useState('');
  const [formats, setFormats] = useState<YouTubeExportFormat[]>([]);

  const mutation = useMutation({
    mutationFn: async ({
      playlistUrl,
      selectedFormats,
    }: {
      playlistUrl: string;
      selectedFormats: YouTubeExportFormat[];
    }) => {
      const result = await apiPost<PlaylistResult>('/api/youtube-playlist', {
        url: playlistUrl,
      });
      await downloadYouTubeExports({
        records: playlistVideosToExportRecords(result.videos),
        context: { title: result.title, source: 'playlist' },
        formats: selectedFormats,
      });
      return result;
    },
    onMutate: ({ selectedFormats }) => {
      trackClarityEvent('tool_run_started', {
        tool: 'playlist_export',
        output_format: selectedFormats.join('_') || 'default',
      });
    },
    onSuccess: (data, { selectedFormats }) => {
      const eventTags = {
        tool: 'playlist_export',
        output_format: selectedFormats.join('_') || 'default',
        result_size: resultSizeBucket(data.videos.length),
        truncated: data.truncated,
      };
      trackClarityEvent('tool_run_succeeded', eventTags);
      trackClarityEvent('export_downloaded', eventTags);
      triggerExportConfetti();
      toast.success(m['landing.exporter.success'](), {
        duration: 6000,
        dismissible: true,
        closeButton: true,
        style: {
          background: '#148a51',
          borderColor: '#148a51',
          color: '#ffffff',
        },
      });
    },
    onError: (error) => {
      trackClarityEvent('tool_run_failed', {
        tool: 'playlist_export',
        error_type: clarityErrorType(error),
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidPlaylistUrl(url)) {
      setClientError(m['landing.exporter.error.invalid']());
      trackClarityEvent('tool_run_failed', {
        tool: 'playlist_export',
        error_type: 'invalid_url',
      });
      return;
    }

    setClientError('');
    mutation.mutate({
      playlistUrl: url.trim(),
      selectedFormats: formats,
    });
  };

  const error = clientError
    ? clientError
    : mutation.error instanceof Error
      ? getErrorCopy(mutation.error.message)
      : '';

  return (
    <section
      id="exporter"
      className="bg-background scroll-mt-14 px-5 py-14 sm:px-8 sm:py-24"
    >
      <div className="mx-auto grid max-w-[1280px] items-start gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
        <div className="pt-2 lg:sticky lg:top-24">
          <div className="border-border bg-card text-foreground mb-6 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium">
            <span className="size-1.5 rounded-full bg-[#ff4d3d]" />
            {m['landing.hero.eyebrow']()}
          </div>
          <h1 className="text-foreground max-w-xl text-[2.5rem] leading-[1.06] font-medium tracking-[-0.04em] text-balance sm:text-5xl lg:text-[3.5rem]">
            {m['landing.hero.headline']()}
          </h1>
          <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-8">
            {m['landing.hero.subheadline']()}
          </p>

          <div className="text-foreground mt-8 hidden gap-3 text-sm sm:grid">
            {[
              [ShieldCheck, m['landing.hero.trust_api']()],
              [LockKeyhole, m['landing.hero.trust_private']()],
              [CheckCircle2, m['landing.hero.trust_account']()],
            ].map(([Icon, label]) => {
              const TrustIcon = Icon as typeof ShieldCheck;
              return (
                <div key={String(label)} className="flex items-center gap-3">
                  <span className="border-border bg-card grid size-8 place-items-center rounded-md border">
                    <TrustIcon className="text-muted-foreground size-4" />
                  </span>
                  <span>{String(label)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-border bg-card rounded-2xl border p-5 sm:p-7">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-foreground flex items-center gap-2 text-lg font-medium">
                  <span className="grid size-8 place-items-center rounded-lg bg-[#ff4d3d] text-white">
                    <Play className="size-4 fill-current" />
                  </span>
                  {m['landing.exporter.title']()}
                </div>
                <p className="text-muted-foreground mt-2 text-sm">
                  {m['landing.exporter.description']()}
                </p>
              </div>
              <div
                className="flex gap-1.5"
                aria-label={m['landing.exporter.formats']()}
              >
                <span className="border-border bg-background text-muted-foreground rounded-sm border px-2 py-1 font-mono text-[10px] font-medium tracking-wide">
                  {YOUTUBE_EXPORT_FORMATS.length} formats
                </span>
                <span className="border-border bg-background text-muted-foreground rounded-sm border px-2 py-1 font-mono text-[10px] font-medium tracking-wide">
                  ZIP
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6">
              <label
                htmlFor="playlist-url"
                className="text-foreground text-sm font-medium"
              >
                {m['landing.exporter.label']()}
              </label>
              <Input
                id="playlist-url"
                name="playlist-url"
                type="url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  if (clientError) setClientError('');
                }}
                placeholder={m['landing.exporter.placeholder']()}
                aria-describedby="playlist-helper playlist-error"
                aria-invalid={Boolean(error)}
                className="border-input bg-card focus-visible:ring-ring/25 mt-2 h-12 w-full rounded-lg px-4 shadow-none"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p
                  id="playlist-helper"
                  className="text-muted-foreground text-xs"
                >
                  {m['landing.exporter.helper']()}
                </p>
                <p className="text-foreground text-xs font-medium">
                  {m['landing.exporter.limit']()}
                </p>
              </div>

              <fieldset className="mt-6">
                <legend className="text-foreground text-sm font-medium">
                  {m['landing.exporter.choose_formats']()}
                </legend>
                <div className="mt-3">
                  <ExportFormatPicker
                    selected={formats}
                    onChange={setFormats}
                    disabled={mutation.isPending}
                  />
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {m['landing.exporter.default_formats']()}
                </p>
              </fieldset>

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/88 mt-6 h-12 w-full rounded-lg px-5 font-medium shadow-none"
              >
                {mutation.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    {m['landing.exporter.exporting']()}
                  </>
                ) : (
                  <>
                    {m['landing.exporter.export']()}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            {error ? (
              <div
                id="playlist-error"
                role="alert"
                className="mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="border-border mt-6 grid grid-cols-3 divide-x border-t pt-5 text-center">
              {[
                ['500', m['landing.exporter.stat_videos']()],
                [
                  String(YOUTUBE_EXPORT_FORMATS.length),
                  m['landing.exporter.stat_formats'](),
                ],
                ['0', m['landing.exporter.stat_uploads']()],
              ].map(([value, label]) => (
                <div key={String(label)} className="px-2 py-2">
                  <div className="text-foreground font-mono text-xl font-medium">
                    {String(value)}
                  </div>
                  <div className="text-muted-foreground mt-1 text-[11px]">
                    {String(label)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
