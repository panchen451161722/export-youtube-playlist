import { useEffect, useRef } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { trackEvent } from '@/lib/analytics';
import { saveBackupDraft } from '@/lib/backup-draft';
import { buttonVariants } from '@/components/ui/button';

export type ExportBackupContent = {
  success: string;
  partial: (count: number) => string;
  trial: string;
  title: string;
  description: string;
  action: string;
  note: string;
  privatePlaylist?: {
    status: string;
    badge: string;
    title: string;
    description: string;
    action: string;
    connectedAction: string;
    note: string;
  };
};

export function ExportBackupCta({
  content,
  playlistUrl,
  tool,
  partialExportCount,
  privatePlaylist = false,
  subscribed = false,
  errorId,
}: {
  content: ExportBackupContent;
  playlistUrl: string;
  tool: string;
  partialExportCount?: number;
  privatePlaylist?: boolean;
  subscribed?: boolean;
  errorId?: string;
}) {
  const privateCopy = privatePlaylist ? content.privatePlaylist : undefined;
  const placement = privateCopy ? 'export_unavailable' : 'export_success';
  const partialExport =
    partialExportCount === undefined
      ? undefined
      : content.partial(partialExportCount);
  const ref = useRef<HTMLDivElement>(null);
  const viewed = useRef(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || viewed.current) return;
        viewed.current = true;
        trackEvent('backup_cta_viewed', { tool, placement });
        observer.disconnect();
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [tool, placement]);

  return (
    <div
      ref={ref}
      id={errorId}
      className="border-border bg-secondary/50 mt-5 rounded-xl border p-4 sm:p-5"
      data-export-backup-cta
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={`flex items-center gap-2 text-xs font-medium ${
            privateCopy
              ? 'text-red-700 dark:text-red-400'
              : partialExport
                ? 'text-amber-800 dark:text-amber-300'
                : 'text-muted-foreground'
          }`}
          role="status"
        >
          {privateCopy ? (
            <LockKeyhole className="size-4 shrink-0" aria-hidden="true" />
          ) : partialExport ? (
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span>{privateCopy?.status ?? partialExport ?? content.success}</span>
        </p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            privateCopy
              ? 'bg-red-500/10 text-red-700 dark:text-red-400'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {privateCopy?.badge ?? content.trial}
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">
            {privateCopy?.title ?? content.title}
          </h3>
          {!privateCopy && (
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {content.description}
            </p>
          )}
        </div>
        <Link
          href="/youtube-playlist-backup"
          className={buttonVariants({
            className: privateCopy
              ? 'h-12 w-full gap-2 rounded-lg px-5 font-medium shadow-none'
              : 'min-h-11 w-full shrink-0 gap-2 sm:w-auto',
          })}
          onClick={() => {
            saveBackupDraft(
              playlistUrl,
              privateCopy ? 'private_playlist' : 'playlist'
            );
            trackEvent('backup_cta_clicked', {
              tool,
              placement,
            });
          }}
        >
          {privateCopy
            ? subscribed
              ? privateCopy.connectedAction
              : privateCopy.action
            : content.action}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {privateCopy && (
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          {privateCopy.description}
        </p>
      )}
      <p className="text-muted-foreground mt-3 text-xs leading-5">
        {privateCopy?.note ?? content.note}
      </p>
    </div>
  );
}
