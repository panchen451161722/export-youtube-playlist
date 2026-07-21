'use client';

import { useEffect, useState, type CSSProperties } from 'react';
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
  Sparkles,
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
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  videoId: string;
  url: string;
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

const youtubeHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

const confettiColors = [
  '#ff4d3d',
  '#5865f2',
  '#f7c948',
  '#2fbf71',
  '#ff82b2',
  '#55c2ff',
];

const confettiPieces = Array.from({ length: 52 }, (_, index) => ({
  color: confettiColors[index % confettiColors.length],
  delay: `${(index % 13) * 0.035}s`,
  duration: `${1.45 + (index % 7) * 0.08}s`,
  left: `${2 + ((index * 37) % 96)}%`,
  rotation: `${360 + (index % 5) * 120}deg`,
  sway: `${-70 + ((index * 29) % 140)}px`,
}));

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
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
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
  return videos.map((video) => [
    video.position,
    safeSpreadsheetText(video.title),
    safeSpreadsheetText(video.channelTitle),
    video.publishedAt,
    video.duration,
    Number(video.viewCount || 0),
    video.videoId,
    video.url,
  ]);
}

function createCsvBlob(result: PlaylistResult) {
  const headers = [
    'Position',
    'Title',
    'Channel',
    'Published At',
    'Duration',
    'Views',
    'Video ID',
    'URL',
  ];
  const csvValue = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`;
  const csv = [headers, ...toExportRows(result.videos)]
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
  const header = [
    'Position',
    'Title',
    'Channel',
    'Published At',
    'Duration',
    'Views',
    'Video ID',
    'URL',
  ].map((value) => ({ value, ...headerStyle }));
  const data = [
    header,
    ...toExportRows(result.videos).map((row) =>
      row.map((value) => ({ value }))
    ),
  ];
  return writeXlsxFile(data, {
    columns: [
      { width: 10 },
      { width: 46 },
      { width: 28 },
      { width: 24 },
      { width: 14 },
      { width: 14 },
      { width: 18 },
      { width: 44 },
    ],
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

function ConfettiBurst({ run }: { run: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!run) return;
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [run]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
      aria-hidden="true"
      data-testid="export-confetti"
    >
      {confettiPieces.map((piece, index) => (
        <span
          key={`${run}-${index}`}
          className="export-confetti-piece"
          style={
            {
              '--confetti-color': piece.color,
              '--confetti-delay': piece.delay,
              '--confetti-duration': piece.duration,
              '--confetti-left': piece.left,
              '--confetti-rotation': piece.rotation,
              '--confetti-sway': piece.sway,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function Hero() {
  const [url, setUrl] = useState('');
  const [clientError, setClientError] = useState('');
  const [formats, setFormats] = useState({ csv: false, xlsx: false });
  const [confettiRun, setConfettiRun] = useState(0);

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
      setConfettiRun((run) => run + 1);
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
      className="relative isolate overflow-hidden bg-[#f7f5ef] px-4 pt-16 pb-20 sm:px-6 sm:pt-24 lg:pb-28 dark:bg-[#111827]"
    >
      <ConfettiBurst run={confettiRun} />
      <div
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 12%, rgba(95, 110, 255, .22), transparent 26%), radial-gradient(circle at 86% 22%, rgba(255, 77, 61, .2), transparent 25%)',
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
        <div className="pt-4 lg:sticky lg:top-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#18213b]/10 bg-white/70 px-3 py-1.5 text-xs font-semibold tracking-wide text-[#18213b] uppercase shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white">
            <Sparkles className="size-3.5 text-[#ff4d3d]" />
            {m['landing.hero.eyebrow']()}
          </div>
          <h1 className="max-w-xl font-serif text-4xl leading-[1.08] font-bold tracking-[-0.035em] text-[#18213b] sm:text-5xl lg:text-[3.55rem] dark:text-white">
            {m['landing.hero.headline']()}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#536078] dark:text-slate-300">
            {m['landing.hero.subheadline']()}
          </p>

          <div className="mt-8 grid gap-3 text-sm text-[#35425b] dark:text-slate-300">
            {[
              [ShieldCheck, m['landing.hero.trust_api']()],
              [LockKeyhole, m['landing.hero.trust_private']()],
              [CheckCircle2, m['landing.hero.trust_account']()],
            ].map(([Icon, label]) => {
              const TrustIcon = Icon as typeof ShieldCheck;
              return (
                <div key={String(label)} className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-white shadow-sm dark:bg-white/10">
                    <TrustIcon className="size-4 text-[#5865f2]" />
                  </span>
                  <span>{String(label)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-[#18213b]/10 bg-white p-3 shadow-[0_28px_90px_rgba(24,33,59,0.16)] sm:p-5 dark:border-white/10 dark:bg-[#182237]">
          <div className="rounded-[1.15rem] border border-[#18213b]/10 bg-[#fbfbfd] p-5 sm:p-7 dark:border-white/10 dark:bg-[#111827]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-[#18213b] dark:text-white">
                  <span className="grid size-8 place-items-center rounded-lg bg-[#ff4d3d] text-white">
                    <Play className="size-4 fill-current" />
                  </span>
                  {m['landing.exporter.title']()}
                </div>
                <p className="mt-2 text-sm text-[#667085] dark:text-slate-400">
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
                    className="rounded-md border border-[#d7dced] bg-white px-2 py-1 font-mono text-[10px] font-bold tracking-wide text-[#44516b] dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  >
                    {format}
                  </span>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6">
              <label
                htmlFor="playlist-url"
                className="text-sm font-semibold text-[#24304a] dark:text-slate-200"
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
                className="mt-2 h-12 w-full rounded-xl border-[#cfd5e4] bg-white px-4 shadow-none focus-visible:ring-[#5865f2]/30 dark:border-white/15 dark:bg-white/5"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p
                  id="playlist-helper"
                  className="text-xs text-[#758097] dark:text-slate-400"
                >
                  {m['landing.exporter.helper']()}
                </p>
                <p className="text-xs font-medium text-[#5865f2] dark:text-indigo-300">
                  {m['landing.exporter.limit']()}
                </p>
              </div>

              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-[#24304a] dark:text-slate-200">
                  {m['landing.exporter.choose_formats']()}
                </legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#d7dced] bg-white p-4 transition hover:border-[#5865f2]/50 hover:bg-[#f8f9ff] has-[[data-checked]]:border-[#5865f2] has-[[data-checked]]:bg-[#f1f2ff] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:has-[[data-checked]]:border-indigo-400 dark:has-[[data-checked]]:bg-indigo-500/10">
                    <Checkbox
                      checked={formats.csv}
                      onCheckedChange={(checked) =>
                        setFormats((current) => ({
                          ...current,
                          csv: checked,
                        }))
                      }
                      className="size-5 data-checked:border-[#5865f2] data-checked:bg-[#5865f2]"
                    />
                    <FileText className="size-5 text-[#5865f2]" />
                    <span className="font-semibold text-[#24304a] dark:text-white">
                      CSV
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#d7dced] bg-white p-4 transition hover:border-[#5865f2]/50 hover:bg-[#f8f9ff] has-[[data-checked]]:border-[#5865f2] has-[[data-checked]]:bg-[#f1f2ff] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:has-[[data-checked]]:border-indigo-400 dark:has-[[data-checked]]:bg-indigo-500/10">
                    <Checkbox
                      checked={formats.xlsx}
                      onCheckedChange={(checked) =>
                        setFormats((current) => ({
                          ...current,
                          xlsx: checked,
                        }))
                      }
                      className="size-5 data-checked:border-[#5865f2] data-checked:bg-[#5865f2]"
                    />
                    <FileSpreadsheet className="size-5 text-[#2f9e62]" />
                    <span className="font-semibold text-[#24304a] dark:text-white">
                      Excel (.xlsx)
                    </span>
                  </label>
                </div>
                <p className="mt-2 text-xs text-[#758097] dark:text-slate-400">
                  {m['landing.exporter.default_formats']()}
                </p>
              </fieldset>

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="mt-6 h-12 w-full rounded-xl bg-[#ff4d3d] px-5 font-semibold text-white shadow-[0_8px_22px_rgba(255,77,61,.28)] hover:bg-[#ec3d30]"
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
                className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[#dfe3ee] pt-5 text-center dark:border-white/10">
              {[
                ['500', m['landing.exporter.stat_videos']()],
                ['2', m['landing.exporter.stat_formats']()],
                ['0', m['landing.exporter.stat_uploads']()],
              ].map(([value, label]) => (
                <div
                  key={String(label)}
                  className="rounded-xl bg-white p-3 dark:bg-white/5"
                >
                  <div className="font-mono text-xl font-bold text-[#18213b] dark:text-white">
                    {String(value)}
                  </div>
                  <div className="mt-1 text-[11px] text-[#758097] dark:text-slate-400">
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
