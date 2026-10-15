import { useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import type { TourDraft } from '@/lib/playlist-guard/tour-sequence';
import {
  GUARD_FREQUENCIES,
  GUARD_SOURCES,
  needsSourceUrl,
  needsYoutubeAccount,
} from '@/lib/playlist-guard/types';
import { TextField } from '@/components/form-field';
import { Button } from '@/components/ui/button';

export function TourCollectionForm({
  labels: l,
  values,
  editing,
  onCancel,
  onSave,
}: {
  labels: Record<string, string>;
  values: TourDraft;
  editing: boolean;
  onCancel: () => void;
  onSave: (value: TourDraft) => void;
}) {
  const schema = z.object({
    source: z.enum(GUARD_SOURCES, { error: l.select_source }),
    url: z
      .url(l.valid_url)
      .max(2048)
      .refine((value) => {
        try {
          const u = new URL(value);
          return (
            u.protocol === 'https:' &&
            ['youtube.com', 'www.youtube.com', 'music.youtube.com'].includes(
              u.hostname
            )
          );
        } catch {
          return false;
        }
      }, l.valid_url),
    name: z.string().trim().max(100),
    frequency: z.enum(GUARD_FREQUENCIES),
    enabled: z.boolean(),
    notifyMissing: z.boolean(),
    notifyAdded: z.boolean(),
    notifyRestored: z.boolean(),
    emailDelivery: z.boolean(),
    exportFrequency: z.enum(GUARD_FREQUENCIES),
  });
  const form = useForm({
    defaultValues: values,
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => onSave(value),
  });
  useEffect(() => {
    form.reset(values);
  }, [values, form]);
  const selectClass =
    'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30';
  return (
    <form
      className="space-y-5 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="source">
        {(field) => (
          <label className="grid gap-2 text-sm font-medium">
            {l.type}
            <select
              data-tour="source"
              className={selectClass}
              value={field.state.value}
              onChange={(e) => {
                const source = e.target.value as TourDraft['source'];
                field.handleChange(source);
                if (source && !needsSourceUrl(source))
                  form.setFieldValue(
                    'url',
                    'https://www.youtube.com/playlist?list=LL'
                  );
              }}
            >
              <option value="">{l.choose_source}</option>
              <option value="playlist">{l.public_playlist}</option>
              <option value="private_playlist">{l.private_playlist}</option>
              <option value="liked_videos">{l.liked_videos}</option>
              <option value="liked_music">{l.liked_music}</option>
              <option value="channel">{l.public_channel}</option>
              <option value="subscriptions">{l.subscriptions}</option>
            </select>
          </label>
        )}
      </form.Field>
      <form.Subscribe selector={(s) => s.values.source}>
        {(source) =>
          source && (
            <>
              {needsYoutubeAccount(source) && (
                <div className="bg-secondary rounded-lg p-3 text-sm">
                  {l.demo_account_note}
                </div>
              )}
              {needsSourceUrl(source) && (
                <form.Field name="url">
                  {(field) => (
                    <div data-tour="url">
                      <TextField
                        field={field}
                        type="url"
                        label={l.url}
                        placeholder="https://www.youtube.com/playlist?list=…"
                        required
                      />
                    </div>
                  )}
                </form.Field>
              )}
              {editing && (
                <form.Field name="name">
                  {(field) => (
                    <TextField field={field} label={l.collection_name} />
                  )}
                </form.Field>
              )}
              <form.Field name="frequency">
                {(field) => (
                  <label className="grid gap-2 text-sm font-medium">
                    {l.backup_frequency}
                    <select
                      data-tour="frequency"
                      className={selectClass}
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value as TourDraft['frequency']
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
            </>
          )
        }
      </form.Subscribe>
      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-medium">{l.notifications}</legend>
        {(['notifyMissing', 'notifyAdded', 'notifyRestored'] as const).map(
          (name, i) => (
            <form.Field key={name} name={name}>
              {(field) => (
                <label
                  data-tour={name}
                  className="flex items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    className="accent-primary size-4"
                    checked={field.state.value}
                    onChange={(e) => field.handleChange(e.target.checked)}
                  />
                  {[l.notify_removed, l.notify_added, l.notify_restored][i]}
                </label>
              )}
            </form.Field>
          )
        )}
      </fieldset>
      <div className="border-border space-y-4 border-t pt-4">
        <form.Field name="emailDelivery">
          {(field) => (
            <label
              data-tour="emailDelivery"
              className="flex items-center gap-3 text-sm font-medium"
            >
              <input
                type="checkbox"
                className="accent-primary size-4"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
              />
              {l.email_export}
            </label>
          )}
        </form.Field>
        <form.Subscribe selector={(s) => s.values.emailDelivery}>
          {(enabled) =>
            enabled && (
              <form.Field name="exportFrequency">
                {(field) => (
                  <label className="grid gap-2 pl-7 text-sm">
                    {l.export_frequency}
                    <select
                      className={selectClass}
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value as TourDraft['frequency']
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
            )
          }
        </form.Subscribe>
      </div>
      <p className="text-muted-foreground text-xs leading-5">
        {l.form_demo_note}
      </p>
      <form.Subscribe selector={(s) => [s.submissionAttempts > 0, s.isValid]}>
        {([submitted, valid]) =>
          submitted && !valid ? (
            <p className="text-destructive text-sm" role="alert">
              {l.form_invalid}
            </p>
          ) : null
        }
      </form.Subscribe>
      <div className="border-border flex justify-end gap-3 border-t pt-5">
        <Button variant="outline" onClick={onCancel}>
          {l.cancel}
        </Button>
        <Button data-tour="create" type="submit">
          {editing ? l.save_changes : l.create}
        </Button>
      </div>
    </form>
  );
}
