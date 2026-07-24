import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type ExportFormat = 'csv' | 'xlsx';
type ExportCell = string | number | null;

const exportHeaders = [
  'Position',
  'Title',
  'Description',
  'Thumbnail URL',
  'Channel Name',
  'Views',
  'Likes',
  'Comments',
  'Duration in Seconds',
  'Duration in Minutes',
  'Duration in Timestamp',
  'Duration',
  'Uploaded Time',
  'Video URL',
  'Video ID',
  'Tags',
  'Tags (in Description)',
  'Emails (in Description)',
  'Links (in Description)',
] as const;

const exportColumnWidths = [
  10, 46, 64, 44, 28, 14, 14, 14, 20, 20, 22, 28, 24, 44, 18, 54, 40, 36, 64,
];

const wrappedExportColumns = new Set([2, 15, 16, 17, 18]);

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

function safeSpreadsheetText(value: string) {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

function safeExportCell(value: ExportCell): ExportCell {
  return typeof value === 'string' ? safeSpreadsheetText(value) : value;
}

function numericExportCell(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function listExportCell(values: string[]): string {
  return `[${values.join(', ')}]`;
}

function safeFileName(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return normalized || 'youtube-playlist';
}

function downloadBlob(blob: Blob, name: string) {
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
  }, 1000);
}

function toExportRows(videos: PlaylistVideo[]) {
  return videos.map((video) =>
    (
      [
        video.position,
        video.title,
        video.description,
        video.thumbnailUrl,
        video.channelTitle,
        numericExportCell(video.viewCount),
        numericExportCell(video.likeCount),
        numericExportCell(video.commentCount),
        video.durationSeconds,
        video.durationMinutes,
        video.duration,
        video.durationText,
        video.publishedAt,
        video.url,
        video.videoId,
        listExportCell(video.tags),
        listExportCell(video.descriptionTags),
        listExportCell(video.descriptionEmails),
        listExportCell(video.descriptionLinks),
      ] satisfies ExportCell[]
    ).map(safeExportCell)
  );
}

function createCsvBlob(result: PlaylistResult) {
  const csvValue = (value: ExportCell) =>
    `"${(value === null ? '' : String(value)).replaceAll('"', '""')}"`;
  const csv = [exportHeaders, ...toExportRows(result.videos)]
    .map((row) => row.map(csvValue).join(','))
    .join('\r\n');
  return new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
}

async function createXlsxBlob(result: PlaylistResult) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const headerStyle = {
    fontWeight: 'bold' as const,
    backgroundColor: '#E8EDF8',
  };
  const header = exportHeaders.map((value) => ({ value, ...headerStyle }));
  const data = [
    header,
    ...toExportRows(result.videos).map((row) =>
      row.map((value, columnIndex) => ({
        value: value ?? undefined,
        alignVertical: 'top' as const,
        wrap: wrappedExportColumns.has(columnIndex),
        ...(columnIndex === 2 ? { height: 72 } : {}),
      }))
    ),
  ];
  return writeXlsxFile(data, {
    columns: exportColumnWidths.map((width) => ({ width })),
    stickyRowsCount: 1,
  }).toBlob();
}

async function exportPlaylist(result: PlaylistResult, formats: ExportFormat[]) {
  const fileName = safeFileName(result.title);

  if (formats.length === 1) {
    const format = formats[0];
    const blob =
      format === 'csv' ? createCsvBlob(result) : await createXlsxBlob(result);
    downloadBlob(blob, `${fileName}.${format}`);
    return;
  }

  const [{ zipSync }, csvBlob, xlsxBlob] = await Promise.all([
    import('fflate'),
    Promise.resolve(createCsvBlob(result)),
    createXlsxBlob(result),
  ]);
  const archive = zipSync(
    {
      [`${fileName}.csv`]: new Uint8Array(await csvBlob.arrayBuffer()),
      [`${fileName}.xlsx`]: new Uint8Array(await xlsxBlob.arrayBuffer()),
    },
    { level: 6 }
  );
  downloadBlob(
    new Blob([archive], { type: 'application/zip' }),
    `${fileName}-exports.zip`
  );
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
    return m['landing.exporter.error.export']();
  }
  return m['landing.exporter.error.network']();
}

export function Hero() {
  const [url, setUrl] = useState('');
  const [clientError, setClientError] = useState('');
  const [formats, setFormats] = useState({ csv: false, xlsx: false });

  const mutation = useMutation({
    mutationFn: async ({
      playlistUrl,
      selectedFormats,
    }: {
      playlistUrl: string;
      selectedFormats: ExportFormat[];
    }) => {
      const result = await apiPost<PlaylistResult>('/api/youtube-playlist', {
        url: playlistUrl,
      });
      try {
        await exportPlaylist(result, selectedFormats);
      } catch {
        throw new Error('export_generation_failed');
      }
      return result;
    },
    onSuccess: () => {
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
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidPlaylistUrl(url)) {
      setClientError(m['landing.exporter.error.invalid']());
      return;
    }

    setClientError('');
    const selectedFormats = (
      Object.entries(formats).filter(([, selected]) => selected) as [
        ExportFormat,
        boolean,
      ][]
    ).map(([format]) => format);

    mutation.mutate({
      playlistUrl: url.trim(),
      selectedFormats:
        selectedFormats.length === 0 ? ['csv', 'xlsx'] : selectedFormats,
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
                {['CSV', 'XLSX'].map((format) => (
                  <span
                    key={format}
                    className="border-border bg-background text-muted-foreground rounded-sm border px-2 py-1 font-mono text-[10px] font-medium tracking-wide"
                  >
                    {format}
                  </span>
                ))}
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
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="border-border bg-card hover:bg-secondary has-[[data-checked]]:border-foreground has-[[data-checked]]:bg-secondary flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors">
                    <Checkbox
                      checked={formats.csv}
                      onCheckedChange={(checked) =>
                        setFormats((current) => ({
                          ...current,
                          csv: checked,
                        }))
                      }
                      className="data-checked:border-primary data-checked:bg-primary size-5"
                    />
                    <FileText className="text-muted-foreground size-5" />
                    <span className="text-foreground font-medium">CSV</span>
                  </label>
                  <label className="border-border bg-card hover:bg-secondary has-[[data-checked]]:border-foreground has-[[data-checked]]:bg-secondary flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors">
                    <Checkbox
                      checked={formats.xlsx}
                      onCheckedChange={(checked) =>
                        setFormats((current) => ({
                          ...current,
                          xlsx: checked,
                        }))
                      }
                      className="data-checked:border-primary data-checked:bg-primary size-5"
                    />
                    <FileSpreadsheet className="text-muted-foreground size-5" />
                    <span className="text-foreground font-medium">
                      Excel (.xlsx)
                    </span>
                  </label>
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
                ['2', m['landing.exporter.stat_formats']()],
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
