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

import { apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { copyText, downloadText, safeFileName } from './public-tool-export';
import type { VideoToolData } from './types';

export type VideoUtilityMode =
  | 'thumbnail'
  | 'tags'
  | 'description'
  | 'embed'
  | 'restrictions';

export type VideoUtilityLabels = {
  inputLabel: string;
  inputPlaceholder: string;
  inputHelper: string;
  submit: string;
  loading: string;
  error: string;
  results: string;
  copy: string;
  copied: string;
  download: string;
  downloadTxt: string;
  downloadAll: string;
  open: string;
  title: string;
  channel: string;
  actualTags: string;
  descriptionTags: string;
  includeDescriptionTags: string;
  sort: string;
  sortOriginal: string;
  sortAz: string;
  sortZa: string;
  sortLongest: string;
  sortShortest: string;
  copyHashtags: string;
  description: string;
  emails: string;
  links: string;
  statistics: string;
  views: string;
  likes: string;
  comments: string;
  noData: string;
  embedOptions: string;
  autoplay: string;
  controls: string;
  loop: string;
  muted: string;
  related: string;
  responsive: string;
  shortsRatio: string;
  startSeconds: string;
  endSeconds: string;
  embedCode: string;
  preview: string;
  restrictionStatus: string;
  unrestricted: string;
  allowedOnly: string;
  blockedIn: string;
  regionCodes: string;
};

type Props = {
  mode: VideoUtilityMode;
  labels: VideoUtilityLabels;
};

type TagSort = 'original' | 'az' | 'za' | 'longest' | 'shortest';

function getErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (error.message.includes('youtube_api_key_missing')) {
    return 'The YouTube API key is not configured yet.';
  }
  if (
    error.message.includes('invalid_youtube_url') ||
    error.message.includes('not_found')
  ) {
    return fallback;
  }
  if (error.message.includes('quota_exceeded')) {
    return 'The YouTube API quota is temporarily exhausted. Please try again later.';
  }
  if (error.message.includes('request_timeout')) {
    return 'YouTube took too long to respond. Please try again.';
  }
  return fallback;
}

function ResultHeader({
  data,
  labels,
}: {
  data: VideoToolData;
  labels: VideoUtilityLabels;
}) {
  return (
    <div className="flex items-start gap-4">
      <img
        src={data.thumbnailUrl}
        alt=""
        className="border-border h-20 w-32 rounded-lg border object-cover"
      />
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {labels.results}
        </p>
        <h2 className="text-foreground mt-1 text-lg font-semibold">
          {data.title}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {labels.channel}: {data.channelTitle}
        </p>
      </div>
    </div>
  );
}

export function VideoUtilityTool({ mode, labels }: Props) {
  const [url, setUrl] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [includeDescriptionTags, setIncludeDescriptionTags] = useState(false);
  const [tagSort, setTagSort] = useState<TagSort>('original');
  const [autoplay, setAutoplay] = useState(false);
  const [controls, setControls] = useState(true);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(false);
  const [related, setRelated] = useState(false);
  const [responsive, setResponsive] = useState(true);
  const [shortsRatio, setShortsRatio] = useState(false);
  const [startSeconds, setStartSeconds] = useState(0);
  const [endSeconds, setEndSeconds] = useState(0);

  const mutation = useMutation({
    mutationFn: (videoUrl: string) =>
      apiPost<VideoToolData>('/api/youtube-video', { url: videoUrl }),
  });

  const visibleTags = useMemo(() => {
    if (!mutation.data) return [];
    const values = [
      ...mutation.data.tags,
      ...(includeDescriptionTags ? mutation.data.descriptionTags : []),
    ].filter(
      (value, index, items) =>
        items.findIndex(
          (item) => item.toLowerCase() === value.toLowerCase()
        ) === index
    );
    if (tagSort === 'az') {
      return [...values].sort((a, b) => a.localeCompare(b));
    }
    if (tagSort === 'za') {
      return [...values].sort((a, b) => b.localeCompare(a));
    }
    if (tagSort === 'longest') {
      return [...values].sort((a, b) => b.length - a.length);
    }
    if (tagSort === 'shortest') {
      return [...values].sort((a, b) => a.length - b.length);
    }
    return values;
  }, [includeDescriptionTags, mutation.data, tagSort]);

  const embedSource = useMemo(() => {
    if (!mutation.data) return '';
    const params = new URLSearchParams();
    if (autoplay) params.set('autoplay', '1');
    if (!controls) params.set('controls', '0');
    if (startSeconds > 0) params.set('start', String(startSeconds));
    if (endSeconds > 0) params.set('end', String(endSeconds));
    if (loop) {
      params.set('loop', '1');
      params.set('playlist', mutation.data.videoId);
    }
    if (muted) params.set('mute', '1');
    if (!related) params.set('rel', '0');
    const query = params.toString();
    return `https://www.youtube.com/embed/${encodeURIComponent(mutation.data.videoId)}${query ? `?${query}` : ''}`;
  }, [
    autoplay,
    controls,
    endSeconds,
    loop,
    muted,
    mutation.data,
    related,
    startSeconds,
  ]);

  const embedCode = useMemo(() => {
    if (!embedSource) return '';
    const width = shortsRatio ? 315 : 560;
    const height = shortsRatio ? 560 : 315;
    const iframe = `<iframe width="${width}" height="${height}" src="${embedSource}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    if (!responsive) return iframe;
    const padding = shortsRatio ? '177.77%' : '56.25%';
    return `<div style="position:relative;overflow:hidden;width:100%;padding-top:${padding}">\n  <iframe style="position:absolute;inset:0;width:100%;height:100%" src="${embedSource}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>\n</div>`;
  }, [embedSource, responsive, shortsRatio]);

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
    ? safeFileName(mutation.data.title, 'youtube-video')
    : 'youtube-video';

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="border-border bg-card rounded-2xl border p-5 sm:p-7"
      >
        <label
          htmlFor={`video-tool-${mode}`}
          className="text-foreground text-sm font-medium"
        >
          {labels.inputLabel}
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Input
            id={`video-tool-${mode}`}
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={labels.inputPlaceholder}
            disabled={mutation.isPending}
            className="bg-background h-11 flex-1"
          />
          <Button
            type="submit"
            disabled={mutation.isPending || !url.trim()}
            className="h-11 sm:min-w-36"
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
        {mutation.error ? (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {getErrorMessage(mutation.error, labels.error)}
          </p>
        ) : null}
      </form>

      {mutation.data ? (
        <section className="border-border bg-card rounded-2xl border p-5 sm:p-7">
          <ResultHeader data={mutation.data} labels={labels} />

          {mode === 'thumbnail' ? (
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {Object.entries(mutation.data.thumbnails)
                .reverse()
                .map(([name, image]) => (
                  <article
                    key={name}
                    className="border-border bg-background overflow-hidden rounded-xl border"
                  >
                    <img
                      src={image.url}
                      alt={`${mutation.data?.title} ${name}`}
                      className="aspect-video w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-4 p-4">
                      <div>
                        <p className="text-foreground font-medium capitalize">
                          {name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {image.width}×{image.height}
                        </p>
                      </div>
                      <a
                        href={image.url}
                        download={`${fileBase}-${name}.jpg`}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' })
                        )}
                      >
                        <Download aria-hidden />
                        {labels.download}
                      </a>
                    </div>
                  </article>
                ))}
            </div>
          ) : null}

          {mode === 'tags' ? (
            <div className="mt-7 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-foreground font-medium">
                    {labels.sort}
                  </span>
                  <select
                    value={tagSort}
                    onChange={(event) =>
                      setTagSort(event.target.value as TagSort)
                    }
                    className="border-input bg-background h-10 w-full rounded-md border px-3"
                  >
                    <option value="original">{labels.sortOriginal}</option>
                    <option value="az">{labels.sortAz}</option>
                    <option value="za">{labels.sortZa}</option>
                    <option value="longest">{labels.sortLongest}</option>
                    <option value="shortest">{labels.sortShortest}</option>
                  </select>
                </label>
                <label className="border-border bg-background flex items-center gap-3 self-end rounded-lg border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={includeDescriptionTags}
                    onChange={(event) =>
                      setIncludeDescriptionTags(event.target.checked)
                    }
                  />
                  {labels.includeDescriptionTags} (
                  {mutation.data.descriptionTags.length})
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleTags.length ? (
                  visibleTags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-secondary text-secondary-foreground rounded-full px-3 py-1.5 text-sm"
                    >
                      {tag}
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
                  onClick={() => copy(visibleTags.join(', '), 'tags')}
                  disabled={!visibleTags.length}
                >
                  {copyStatus === 'tags' ? <Check /> : <Clipboard />}
                  {copyStatus === 'tags' ? labels.copied : labels.copy}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    copy(
                      visibleTags.map((tag) => `#${tag}`).join(', '),
                      'hashtags'
                    )
                  }
                  disabled={!visibleTags.length}
                >
                  {copyStatus === 'hashtags' ? <Check /> : <Clipboard />}
                  {copyStatus === 'hashtags'
                    ? labels.copied
                    : labels.copyHashtags}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    downloadText(
                      visibleTags.join('\r\n'),
                      `${fileBase}-tags.txt`
                    )
                  }
                  disabled={!visibleTags.length}
                >
                  <Download />
                  {labels.downloadTxt}
                </Button>
              </div>
            </div>
          ) : null}

          {mode === 'description' ? (
            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              <article className="border-border bg-background rounded-xl border p-5 lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{labels.description}</h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copy(mutation.data?.description ?? '', 'description')
                      }
                    >
                      <Clipboard />
                      {copyStatus === 'description'
                        ? labels.copied
                        : labels.copy}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadText(
                          mutation.data?.description ?? '',
                          `${fileBase}-description.txt`
                        )
                      }
                    >
                      <Download />
                      {labels.downloadTxt}
                    </Button>
                  </div>
                </div>
                <pre className="text-foreground mt-4 max-h-96 overflow-auto text-sm leading-6 whitespace-pre-wrap">
                  {mutation.data.description || labels.noData}
                </pre>
              </article>
              <article className="border-border bg-background rounded-xl border p-5">
                <h3 className="font-semibold">{labels.emails}</h3>
                <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
                  {mutation.data.emails.length ? (
                    mutation.data.emails.map((email) => (
                      <li key={email}>{email}</li>
                    ))
                  ) : (
                    <li>{labels.noData}</li>
                  )}
                </ul>
              </article>
              <article className="border-border bg-background rounded-xl border p-5">
                <h3 className="font-semibold">{labels.links}</h3>
                <ul className="mt-3 max-h-56 space-y-2 overflow-auto text-sm">
                  {mutation.data.links.length ? (
                    mutation.data.links.map((link) => (
                      <li key={link}>
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary break-all hover:underline"
                        >
                          {link}
                        </a>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">{labels.noData}</li>
                  )}
                </ul>
              </article>
              <article className="border-border bg-background rounded-xl border p-5 lg:col-span-2">
                <h3 className="font-semibold">{labels.statistics}</h3>
                <dl className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    [labels.views, mutation.data.viewCount],
                    [labels.likes, mutation.data.likeCount],
                    [labels.comments, mutation.data.commentCount],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-muted/40 rounded-lg p-3">
                      <dt className="text-muted-foreground text-xs">{label}</dt>
                      <dd className="mt-1 font-semibold">
                        {value || labels.noData}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            </div>
          ) : null}

          {mode === 'embed' ? (
            <div className="mt-7 space-y-6">
              <fieldset>
                <legend className="font-semibold">{labels.embedOptions}</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    [labels.autoplay, autoplay, setAutoplay],
                    [labels.controls, controls, setControls],
                    [labels.loop, loop, setLoop],
                    [labels.muted, muted, setMuted],
                    [labels.related, related, setRelated],
                    [labels.responsive, responsive, setResponsive],
                    [labels.shortsRatio, shortsRatio, setShortsRatio],
                  ].map(([label, checked, setter]) => (
                    <label
                      key={String(label)}
                      className="border-border bg-background flex items-center gap-3 rounded-lg border p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked as boolean}
                        onChange={(event) =>
                          (
                            setter as React.Dispatch<
                              React.SetStateAction<boolean>
                            >
                          )(event.target.checked)
                        }
                      />
                      {String(label)}
                    </label>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="font-medium">{labels.startSeconds}</span>
                    <Input
                      type="number"
                      min={0}
                      value={startSeconds}
                      onChange={(event) =>
                        setStartSeconds(
                          Math.max(0, Number(event.target.value) || 0)
                        )
                      }
                      className="mt-2"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="font-medium">{labels.endSeconds}</span>
                    <Input
                      type="number"
                      min={0}
                      value={endSeconds}
                      onChange={(event) =>
                        setEndSeconds(
                          Math.max(0, Number(event.target.value) || 0)
                        )
                      }
                      className="mt-2"
                    />
                  </label>
                </div>
              </fieldset>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{labels.embedCode}</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copy(embedCode, 'embed')}
                  >
                    {copyStatus === 'embed' ? <Check /> : <Clipboard />}
                    {copyStatus === 'embed' ? labels.copied : labels.copy}
                  </Button>
                </div>
                <textarea
                  readOnly
                  value={embedCode}
                  className="border-input bg-background mt-3 min-h-40 w-full rounded-lg border p-3 font-mono text-xs"
                />
              </div>
              <div>
                <h3 className="font-semibold">{labels.preview}</h3>
                <div
                  className="bg-muted mt-3 overflow-hidden rounded-xl"
                  style={{
                    aspectRatio: shortsRatio ? '9 / 16' : '16 / 9',
                    maxWidth: shortsRatio ? 420 : undefined,
                  }}
                >
                  <iframe
                    src={embedSource}
                    title={mutation.data.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          ) : null}

          {mode === 'restrictions' ? (
            <div className="mt-7 space-y-5">
              <div className="border-border bg-background rounded-xl border p-5">
                <p className="text-muted-foreground text-sm">
                  {labels.restrictionStatus}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {mutation.data.regionRestriction.type === 'none'
                    ? labels.unrestricted
                    : mutation.data.regionRestriction.type === 'allowed'
                      ? labels.allowedOnly
                      : labels.blockedIn}
                </p>
              </div>
              {mutation.data.regionRestriction.regions.length ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{labels.regionCodes}</h3>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          copy(
                            mutation.data?.regionRestriction.regions.join(
                              '\r\n'
                            ) ?? '',
                            'regions'
                          )
                        }
                      >
                        <Clipboard />
                        {copyStatus === 'regions' ? labels.copied : labels.copy}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          downloadText(
                            mutation.data?.regionRestriction.regions.join(
                              '\r\n'
                            ) ?? '',
                            `${fileBase}-regions.txt`
                          )
                        }
                      >
                        <Download />
                        {labels.downloadTxt}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mutation.data.regionRestriction.regions.map((region) => (
                      <span
                        key={region}
                        className="bg-secondary text-secondary-foreground rounded-md px-2.5 py-1 text-sm"
                      >
                        {region}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <a
                href={`https://www.youtube.com/watch?v=${encodeURIComponent(mutation.data.videoId)}`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                <ExternalLink />
                {labels.open}
              </a>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
