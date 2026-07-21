'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  LockKeyhole,
  Play,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';
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
  anchor.click();
  URL.revokeObjectURL(objectUrl);
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

function exportCsv(result: PlaylistResult) {
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
  downloadBlob(
    new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
    `${safeFileName(result.title)}.csv`
  );
}

async function exportXlsx(result: PlaylistResult) {
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
  await writeXlsxFile(data, {
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
  }).toFile(`${safeFileName(result.title)}.xlsx`);
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
  return m['landing.exporter.error.network']();
}

export function Hero() {
  const [url, setUrl] = useState('');
  const [clientError, setClientError] = useState('');
  const [copied, setCopied] = useState(false);
  const [xlsxBusy, setXlsxBusy] = useState(false);

  const mutation = useMutation({
    mutationFn: (playlistUrl: string) =>
      apiPost<PlaylistResult>('/api/youtube-playlist', {
        url: playlistUrl,
      }),
  });

  const result = mutation.data;
  const previewRows = useMemo(
    () => result?.videos.slice(0, 12) ?? [],
    [result]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCopied(false);
    if (!isValidPlaylistUrl(url)) {
      setClientError(m['landing.exporter.error.invalid']());
      return;
    }
    setClientError('');
    mutation.mutate(url.trim());
  };

  const copyLinks = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(
      result.videos.map((video) => video.url).join('\n')
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const handleXlsx = async () => {
    if (!result) return;
    setXlsxBusy(true);
    try {
      await exportXlsx(result);
    } finally {
      setXlsxBusy(false);
    }
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
                {['CSV', 'XLSX', 'LINKS'].map((format) => (
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
              <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
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
                  className="h-12 flex-1 rounded-xl border-[#cfd5e4] bg-white px-4 shadow-none focus-visible:ring-[#5865f2]/30 dark:border-white/15 dark:bg-white/5"
                />
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="h-12 shrink-0 rounded-xl bg-[#ff4d3d] px-5 font-semibold text-white shadow-[0_8px_22px_rgba(255,77,61,.28)] hover:bg-[#ec3d30]"
                >
                  {mutation.isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      {m['landing.exporter.loading']()}
                    </>
                  ) : (
                    <>
                      {m['landing.exporter.preview']()}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
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

            {result ? (
              <div className="mt-6 border-t border-[#dfe3ee] pt-6 dark:border-white/10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.14em] text-[#5865f2] uppercase dark:text-indigo-300">
                      {m['landing.exporter.ready']()}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-[#18213b] dark:text-white">
                      {result.title}
                    </h2>
                    <p className="mt-1 text-sm text-[#667085] dark:text-slate-400">
                      {m['landing.exporter.summary']({
                        count: result.returnedItems,
                        total: result.totalItems,
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => exportCsv(result)}
                    >
                      <Download className="size-3.5" />
                      CSV
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleXlsx}
                      disabled={xlsxBusy}
                    >
                      {xlsxBusy ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="size-3.5" />
                      )}
                      XLSX
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyLinks}
                    >
                      {copied ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Clipboard className="size-3.5" />
                      )}
                      {copied
                        ? m['landing.exporter.copied']()
                        : m['landing.exporter.copy']()}
                    </Button>
                  </div>
                </div>

                {result.truncated ? (
                  <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    {m['landing.exporter.truncated']()}
                  </p>
                ) : null}

                {previewRows.length ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-[#dfe3ee] dark:border-white/10">
                    <div className="max-h-[31rem] overflow-auto">
                      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                        <thead className="sticky top-0 bg-[#eef1f8] text-xs text-[#59657d] uppercase dark:bg-[#25304a] dark:text-slate-300">
                          <tr>
                            <th className="px-3 py-3 font-semibold">#</th>
                            <th className="px-3 py-3 font-semibold">
                              {m['landing.exporter.table.title']()}
                            </th>
                            <th className="px-3 py-3 font-semibold">
                              {m['landing.exporter.table.channel']()}
                            </th>
                            <th className="px-3 py-3 font-semibold">
                              {m['landing.exporter.table.duration']()}
                            </th>
                            <th className="px-3 py-3 text-right font-semibold">
                              {m['landing.exporter.table.views']()}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((video) => (
                            <tr
                              key={`${video.videoId}-${video.position}`}
                              className="border-t border-[#e7e9f0] bg-white text-[#35425b] dark:border-white/10 dark:bg-transparent dark:text-slate-300"
                            >
                              <td className="px-3 py-3 font-mono text-xs">
                                {video.position}
                              </td>
                              <td className="max-w-[320px] px-3 py-3 font-medium text-[#18213b] dark:text-white">
                                <a
                                  href={video.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="line-clamp-2 hover:underline"
                                >
                                  {video.title}
                                </a>
                              </td>
                              <td className="px-3 py-3">
                                {video.channelTitle}
                              </td>
                              <td className="px-3 py-3 font-mono text-xs">
                                {video.duration || '—'}
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-xs">
                                {Number(video.viewCount || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-[#eef1f8] p-4 text-sm text-[#536078] dark:bg-white/5 dark:text-slate-300">
                    {m['landing.exporter.empty']()}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[#dfe3ee] pt-5 text-center dark:border-white/10">
                {[
                  ['500', m['landing.exporter.stat_videos']()],
                  ['3', m['landing.exporter.stat_formats']()],
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
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
