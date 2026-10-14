import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';

import type {
  GuardCollectionDetail,
  GuardItem,
  GuardSnapshot,
} from '@/lib/playlist-guard/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function CollectionExportDialog({
  collection,
  snapshot,
  initialKind,
  labels: l,
  onClose,
  onExport,
}: {
  collection: GuardCollectionDetail;
  snapshot?: GuardSnapshot;
  initialKind: 'latest' | 'missing' | 'snapshot';
  labels: Record<string, string>;
  onClose: () => void;
  onExport: (
    items: GuardItem[],
    name: string,
    format: 'csv' | 'json' | 'xlsx'
  ) => Promise<void>;
}) {
  const [kind, setKind] = useState(initialKind);
  const [format, setFormat] = useState<'csv' | 'json' | 'xlsx'>('xlsx');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choices = [
    {
      id: 'latest' as const,
      label: l.export_latest,
      items: collection.snapshots[0]?.items ?? [],
    },
    {
      id: 'missing' as const,
      label: l.export_missing,
      items: collection.missing,
    },
    ...(snapshot
      ? [
          {
            id: 'snapshot' as const,
            label: l.export_snapshot,
            items: snapshot.items,
          },
        ]
      : []),
  ];
  const items = choices.find((choice) => choice.id === kind)?.items ?? [];
  async function download() {
    if (!items.length || busy) return;
    setBusy(true);
    setError('');
    try {
      await onExport(
        items,
        `${collection.name}-${kind}${kind === 'snapshot' ? `-${snapshot?.createdAt.slice(0, 10)}` : ''}`,
        format
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : l.action_error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="p-0 sm:max-w-[500px]" showCloseButton={!busy}>
        <DialogHeader className="border-border border-b p-5">
          <DialogTitle className="text-xl">{l.export_data}</DialogTitle>
          <DialogDescription>{l.export_description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 pb-5">
          {choices.map((choice) => (
            <label
              key={choice.id}
              className={`flex items-center gap-3 rounded-lg border p-4 ${kind === choice.id ? 'border-primary bg-secondary/40' : 'border-border'} ${!choice.items.length ? 'opacity-50' : ''}`}
            >
              <input
                type="radio"
                name="collection-export"
                className="accent-primary size-4"
                checked={kind === choice.id}
                disabled={!choice.items.length || busy}
                onChange={() => setKind(choice.id)}
              />
              <span>
                <span className="block text-sm font-medium">
                  {choice.label}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs">
                  {choice.items.length} {l.items_available}
                </span>
              </span>
            </label>
          ))}
          <label className="grid gap-2 text-sm font-medium">
            {l.file_format}
            <select
              className="bg-background border-input h-10 rounded-lg border px-3"
              value={format}
              disabled={busy}
              onChange={(e) => setFormat(e.target.value as typeof format)}
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
              <option value="json">JSON (.json)</option>
            </select>
          </label>
          <p className="text-muted-foreground text-xs leading-5">
            {l.export_scope_note}
          </p>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="border-border flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" disabled={busy} onClick={onClose}>
              {l.cancel}
            </Button>
            <Button
              disabled={busy || !items.length}
              onClick={() => void download()}
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {busy ? l.preparing_export : l[`export_${format}`]}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
