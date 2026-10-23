import { useEffect, useRef } from 'react';
import { ArrowRight, CheckCircle2, History } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { trackEvent } from '@/lib/analytics';
import { saveBackupDraft } from '@/lib/backup-draft';
import { buttonVariants } from '@/components/ui/button';

export type ExportBackupContent = {
  success: string;
  title: string;
  description: string;
  action: string;
  note: string;
};

export function ExportBackupCta({
  content,
  playlistUrl,
  tool,
}: {
  content: ExportBackupContent;
  playlistUrl: string;
  tool: string;
}) {
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
      className="border-border bg-secondary/50 mt-5 rounded-xl border p-5"
      data-export-backup-cta
    >
      <p
        className="text-primary flex items-center gap-2 text-sm font-medium"
        role="status"
      >
        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
        {content.success}
      </p>
      <h3 className="mt-3 flex items-center gap-2 text-base font-semibold">
        <History className="size-4 shrink-0" aria-hidden="true" />
        {content.title}
      </h3>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        {content.description}
      </p>
      <Link
        href="/youtube-playlist-backup"
        className={buttonVariants({
          className: 'mt-4 min-h-11 w-full gap-2 sm:w-auto',
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
      <p className="text-muted-foreground mt-2 text-xs leading-5">
        {content.note}
      </p>
    </div>
  );
}
