import { useEffect, useRef } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

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
};

export function ExportBackupCta({
  content,
  playlistUrl,
  tool,
  partialExportCount,
}: {
  content: ExportBackupContent;
  playlistUrl: string;
  tool: string;
  partialExportCount?: number;
}) {
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
        trackEvent('backup_cta_viewed', { tool, placement: 'export_success' });
        observer.disconnect();
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [tool]);

  return (
    <div
      ref={ref}
      className="border-border bg-secondary/50 mt-5 rounded-xl border p-4 sm:p-5"
      data-export-backup-cta
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={`flex items-center gap-2 text-xs font-medium ${
            partialExport
              ? 'text-amber-800 dark:text-amber-300'
              : 'text-muted-foreground'
          }`}
          role="status"
        >
          {partialExport ? (
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span>{partialExport ?? content.success}</span>
        </p>
        <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold">
          {content.trial}
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">{content.title}</h3>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            {content.description}
          </p>
        </div>
        <Link
          href="/youtube-playlist-backup"
          className={buttonVariants({
            className: 'min-h-11 w-full shrink-0 gap-2 sm:w-auto',
          })}
          onClick={() => {
            saveBackupDraft(playlistUrl);
            trackEvent('backup_cta_clicked', {
              tool,
              placement: 'export_success',
            });
          }}
        >
          {content.action}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <p className="text-muted-foreground mt-3 text-xs leading-5">
        {content.note}
      </p>
    </div>
  );
}
