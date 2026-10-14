import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import {
  GUARD_FREQUENCIES,
  type GuardAction,
  type GuardCollection,
  type GuardCreateInput,
} from '@/lib/playlist-guard/types';
import { TextField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type GuardLabels = Record<string, string>;
export function CollectionFormDialog({
  collection,
  onClose,
  onSave,
  labels: l,
  emailAvailable,
  emailNotice,
  onVerifyEmail,
  busy,
}: {
  collection?: GuardCollection;
  onClose: () => void;
  onSave: (action: GuardAction) => Promise<unknown>;
  labels: GuardLabels;
  emailAvailable: boolean;
  emailNotice: string;
  onVerifyEmail?: () => void;
  busy: boolean;
}) {
  const [error, setError] = useState('');
  const initial: GuardCreateInput = collection
    ? {
        name: collection.name,
        url: collection.url,
        source: collection.source,
        frequency: collection.frequency,
        notifyMissing: collection.notifyMissing,
        notifyAdded: collection.notifyAdded,
        emailDelivery: collection.emailDelivery,
      }
    : {
        name: '',
        url: '',
        source: 'playlist',
        frequency: 'weekly',
        notifyMissing: false,
        notifyAdded: false,
        emailDelivery: false,
      };
  const form = useForm({
    defaultValues: initial,
    validators: {
      onSubmit: z.object({
        name: z.string().trim().min(1, l.validation).max(100),
        url: z.string().trim().min(1, l.validation).max(2048),
        source: z.enum(['playlist', 'channel']),
        frequency: z.enum(GUARD_FREQUENCIES),
        notifyMissing: z.boolean(),
        notifyAdded: z.boolean(),
        emailDelivery: z.boolean(),
      }),
    },
    onSubmit: async ({ value }) => {
      setError('');
      try {
        if (collection) {
          const patch: Extract<GuardAction, { action: 'update' }> = {
            action: 'update',
            id: collection.id,
          };
          if (value.name.trim() !== initial.name)
            patch.name = value.name.trim();
          if (value.frequency !== initial.frequency)
            patch.frequency = value.frequency;
          for (const key of [
            'notifyMissing',
            'notifyAdded',
            'emailDelivery',
          ] as const)
            if (value[key] !== initial[key]) patch[key] = value[key];
          await onSave(patch);
        } else
          await onSave({
            action: 'create',
            ...value,
            name: value.name.trim(),
            url: value.url.trim(),
          });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : l.action_error);
      }
    },
  });
  const selectClass =
    'h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60';
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto p-0 sm:max-w-[500px]"
        showCloseButton={!busy}
      >
        <DialogHeader className="border-border border-b p-5">
          <DialogTitle className="text-xl">
            {collection ? l.update_collection : l.add_collection}
          </DialogTitle>
          <DialogDescription>
            {collection ? l.edit_description : l.add_description}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5 px-5 pb-5"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="source">
            {(field) => (
              <label className="grid gap-2 text-sm font-medium">
                {l.source}
                <select
                  className={selectClass}
                  value={field.state.value}
                  disabled={!!collection || busy}
                  onChange={(e) =>
                    field.handleChange(e.target.value as 'playlist' | 'channel')
                  }
                >
                  <option value="playlist">{l.public_playlist}</option>
                  <option value="channel">{l.public_channel}</option>
                </select>
              </label>
            )}
          </form.Field>
          <form.Field name="url">
            {(field) => (
              <TextField
                field={field}
                label={l.url}
                placeholder="https://www.youtube.com/playlist?list=…"
                disabled={!!collection || busy}
                required
              />
            )}
          </form.Field>
          {!collection && (
            <p className="text-muted-foreground text-xs leading-5">
              {l.private_note}
            </p>
          )}
          <form.Field name="name">
            {(field) => (
              <TextField
                field={field}
                label={l.name}
                placeholder={l.name_placeholder}
                disabled={busy}
                required
              />
            )}
          </form.Field>
          <form.Field name="frequency">
            {(field) => (
              <label className="grid gap-2 text-sm font-medium">
                {l.backup_frequency}
                <select
                  className={selectClass}
                  value={field.state.value}
                  disabled={busy}
                  onChange={(e) =>
                    field.handleChange(
                      e.target.value as GuardCreateInput['frequency']
                    )
                  }
                >
                  {GUARD_FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {l[f]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </form.Field>
          <fieldset className="border-border space-y-3 border-t pt-4">
            <legend className="px-1 text-sm font-medium">
              {l.notifications}
            </legend>
            {(['notifyMissing', 'notifyAdded', 'emailDelivery'] as const).map(
              (name, index) => (
                <form.Field name={name} key={name}>
                  {(field) => (
                    <label className="flex items-center gap-3 text-sm">
                      <input
                        className="accent-primary size-4"
                        type="checkbox"
                        checked={field.state.value}
                        disabled={
                          busy || (!emailAvailable && !field.state.value)
                        }
                        onChange={(e) => field.handleChange(e.target.checked)}
                      />
                      {
                        [l.email_missing, l.email_added, l.email_delivery][
                          index
                        ]
                      }
                    </label>
                  )}
                </form.Field>
              )
            )}
            <p className="text-muted-foreground text-xs leading-5">
              {emailAvailable ? l.email_schedule_note : emailNotice}
            </p>
            {onVerifyEmail && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={onVerifyEmail}
              >
                {l.verify_email}
              </Button>
            )}
          </fieldset>
          <form.Subscribe selector={(s) => [s.submissionAttempts, s.isValid]}>
            {([attempts, valid]) =>
              !!attempts &&
              !valid && (
                <p role="alert" className="text-destructive text-sm">
                  {l.validation}
                </p>
              )
            }
          </form.Subscribe>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="border-border flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" disabled={busy} onClick={onClose}>
              {l.cancel}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? l.busy : collection ? l.save : l.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
