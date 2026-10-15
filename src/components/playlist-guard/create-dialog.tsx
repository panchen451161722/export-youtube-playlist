import { useId, useState, type ReactNode } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import {
  GUARD_FREQUENCIES,
  GUARD_SOURCES,
  needsSourceUrl,
  needsYoutubeAccount,
  type GuardAction,
  type GuardCollection,
  type GuardCreateInput,
} from '@/lib/playlist-guard/types';
import type { YoutubeConnection } from '@/lib/youtube-connections/types';
import { TextField } from '@/components/form-field';
import { Button } from '@/components/ui/button';

import { CollectionDialog } from './collection-dialog';

export type GuardLabels = Record<string, string>;
type CollectionFormProps = {
  collection?: GuardCollection;
  accounts?: YoutubeConnection[];
  onConnect?: (id?: string) => void;
  accountsLoading?: boolean;
  accountsConfigured?: boolean;
  onSave: (action: GuardAction) => Promise<unknown>;
  onComplete: () => void;
  onCancel?: () => void;
  labels: GuardLabels;
  emailAvailable: boolean;
  emailNotice: string;
  onVerifyEmail?: () => void;
  busy: boolean;
  disabled?: boolean;
  initialValues?: Partial<GuardCreateInput>;
  showEmailBackup?: boolean;
  footer?: ReactNode;
};

export function CollectionFormDialog({
  onClose,
  ...props
}: Omit<CollectionFormProps, 'onComplete' | 'onCancel'> & {
  onClose: () => void;
}) {
  return (
    <CollectionDialog
      title={
        props.collection
          ? props.labels.update_collection
          : props.labels.add_collection
      }
      description={
        props.collection
          ? props.labels.edit_description
          : props.labels.add_description
      }
      closeLabel={props.labels.close}
      busy={props.busy}
      onClose={onClose}
    >
      <CollectionForm {...props} onComplete={onClose} onCancel={onClose} />
    </CollectionDialog>
  );
}

export function CollectionForm({
  collection,
  accounts = [],
  onConnect,
  accountsLoading = false,
  accountsConfigured = false,
  onSave,
  onComplete,
  onCancel,
  labels: l,
  emailAvailable,
  emailNotice,
  onVerifyEmail,
  busy,
  disabled = false,
  initialValues,
  showEmailBackup = !!collection,
  footer,
}: CollectionFormProps) {
  const formId = useId();
  const locked = busy || disabled;
  const [error, setError] = useState('');
  const initial: GuardCreateInput = collection
    ? {
        name: collection.name,
        url: collection.url,
        source: collection.source,
        connectionId: collection.connectionId,
        frequency: collection.frequency,
        notifyMissing: collection.notifyMissing,
        notifyAdded: collection.notifyAdded,
        notifyRestored: collection.notifyRestored ?? false,
        emailDelivery: collection.emailDelivery,
      }
    : {
        name: '',
        url: '',
        source: 'playlist',
        connectionId: '',
        frequency: 'daily',
        notifyMissing: true,
        notifyAdded: true,
        notifyRestored: true,
        emailDelivery: false,
        ...initialValues,
      };
  const form = useForm({
    defaultValues: initial,
    validators: {
      onSubmit: z
        .object({
          name: z
            .string()
            .trim()
            .min(collection ? 1 : 0, l.validation)
            .max(100),
          url: z.string().trim().max(2048),
          source: z.enum(GUARD_SOURCES),
          connectionId: z.string().optional(),
          frequency: z.enum(GUARD_FREQUENCIES),
          notifyMissing: z.boolean(),
          notifyAdded: z.boolean(),
          notifyRestored: z.boolean(),
          emailDelivery: z.boolean(),
        })
        .refine(
          (value) => !needsSourceUrl(value.source) || !!value.url.trim(),
          { message: l.validation, path: ['url'] }
        )
        .refine(
          (value) => !needsYoutubeAccount(value.source) || !!value.connectionId,
          { message: l.account_required, path: ['connectionId'] }
        ),
    },
    onSubmit: async ({ value }) => {
      if (locked) return;
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
            'notifyRestored',
            'emailDelivery',
          ] as const)
            if (value[key] !== initial[key]) patch[key] = value[key];
          await onSave(patch);
        } else
          await onSave({
            action: 'create',
            ...value,
            name: defaultCollectionName(value, l, accounts),
            connectionId: needsYoutubeAccount(value.source)
              ? value.connectionId
              : undefined,
            url: value.url.trim(),
          });
        onComplete();
      } catch (e) {
        setError(e instanceof Error ? e.message : l.action_error);
      }
    },
  });
  const selectClass =
    'h-12 w-full rounded-lg border border-input bg-background px-3 text-base shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60';
  return (
    <form
      className="space-y-6 [&_[data-slot=field-label]]:text-base [&_[data-slot=input]]:h-12 [&_[data-slot=input]]:rounded-lg [&_[data-slot=input]]:px-3 [&_[data-slot=input]]:text-base"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="source">
        {(field) => (
          <label className="grid gap-2.5 text-base font-medium">
            {l.source}
            <select
              className={selectClass}
              value={field.state.value}
              disabled={!!collection || locked}
              onChange={(e) =>
                field.handleChange(e.target.value as GuardCreateInput['source'])
              }
            >
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
      <form.Subscribe selector={(state) => state.values.source}>
        {(source) => (
          <div className="space-y-5">
            {needsYoutubeAccount(source) && (
              <div className="space-y-3">
                <form.Field name="connectionId">
                  {(field) => (
                    <label className="grid gap-2.5 text-base font-medium">
                      {l.choose_account}
                      <select
                        className={selectClass}
                        value={field.state.value || ''}
                        disabled={!!collection || locked || accountsLoading}
                        onChange={(e) => field.handleChange(e.target.value)}
                        required
                      >
                        <option value="">
                          {accountsLoading ? l.loading : l.choose_account}
                        </option>
                        {accounts.map((account) => (
                          <option
                            key={account.id}
                            value={account.id}
                            disabled={account.status !== 'connected'}
                          >
                            {account.channelTitle}
                            {account.status === 'connected'
                              ? ''
                              : ` · ${l['account_' + account.status]}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </form.Field>
                <p className="text-muted-foreground text-xs leading-5">
                  {!accountsConfigured
                    ? l.oauth_unavailable
                    : l.accounts_description}
                </p>
                {onConnect && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || !accountsConfigured}
                    onClick={() => onConnect(collection?.connectionId)}
                  >
                    {collection?.connectionId
                      ? l.reconnect_account
                      : l.connect_account}
                  </Button>
                )}
              </div>
            )}
            {needsSourceUrl(source) && (
              <div className="space-y-2">
                <form.Field name="url">
                  {(field) => (
                    <TextField
                      field={field}
                      id={`${formId}-url`}
                      label={l.url}
                      placeholder={
                        source === 'channel'
                          ? 'https://www.youtube.com/@channel'
                          : 'https://www.youtube.com/playlist?list=…'
                      }
                      disabled={!!collection || locked}
                      required
                    />
                  )}
                </form.Field>
                {!collection && (
                  <p className="text-muted-foreground text-xs leading-5">
                    {source === 'private_playlist'
                      ? l.private_source_note
                      : l.private_note}
                  </p>
                )}
              </div>
            )}
            {source === 'liked_music' && (
              <p className="text-muted-foreground bg-secondary rounded-lg p-3 text-sm leading-6">
                {l.music_note}
              </p>
            )}
            {source === 'subscriptions' && (
              <p className="text-muted-foreground bg-secondary rounded-lg p-3 text-sm leading-6">
                {l.subscriptions_note}
              </p>
            )}
          </div>
        )}
      </form.Subscribe>
      {collection && (
        <form.Field name="name">
          {(field) => (
            <TextField
              field={field}
              id={`${formId}-name`}
              label={l.name}
              placeholder={l.name_placeholder}
              disabled={locked}
              required
            />
          )}
        </form.Field>
      )}
      <form.Field name="frequency">
        {(field) => (
          <label className="grid gap-2.5 text-base font-medium">
            {l.backup_frequency}
            <select
              className={selectClass}
              value={field.state.value}
              disabled={locked}
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
      <fieldset className="space-y-3.5">
        <legend className="mb-3 text-base font-medium">
          {l.notifications}
        </legend>
        {(['notifyMissing', 'notifyAdded', 'notifyRestored'] as const).map(
          (name, index) => (
            <form.Field name={name} key={name}>
              {(field) => (
                <label className="text-muted-foreground flex items-start gap-3 text-base leading-6">
                  <input
                    className="accent-primary mt-0.5 size-5 shrink-0"
                    type="checkbox"
                    checked={field.state.value}
                    disabled={locked}
                    onChange={(e) => field.handleChange(e.target.checked)}
                  />
                  <form.Subscribe selector={(s) => s.values.source}>
                    {(source) =>
                      source === 'subscriptions'
                        ? [l.item_missing, l.item_added, l.item_restored][index]
                        : [l.email_missing, l.email_added, l.email_restored][
                            index
                          ]
                    }
                  </form.Subscribe>
                </label>
              )}
            </form.Field>
          )
        )}
        <p className="text-muted-foreground text-xs leading-5">
          {emailAvailable
            ? showEmailBackup
              ? l.email_schedule_note
              : l.email_changes_note
            : emailNotice}
        </p>
        {onVerifyEmail && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={locked}
            onClick={onVerifyEmail}
          >
            {l.verify_email}
          </Button>
        )}
      </fieldset>
      {showEmailBackup && (
        <div className="border-border border-t pt-5">
          <form.Field name="emailDelivery">
            {(field) => (
              <label className="flex items-start gap-3 text-sm leading-6">
                <input
                  className="accent-primary mt-0.5 size-5 shrink-0"
                  type="checkbox"
                  checked={field.state.value}
                  disabled={locked || (!emailAvailable && !field.state.value)}
                  onChange={(e) => field.handleChange(e.target.checked)}
                />
                {l.email_delivery}
              </label>
            )}
          </form.Field>
        </div>
      )}
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
      {footer}
      <div className="border-border flex justify-end gap-3 border-t pt-5">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="h-11 px-5 text-base"
            disabled={busy}
            onClick={onCancel}
          >
            {l.cancel}
          </Button>
        )}
        {!footer && (
          <Button
            type="submit"
            className="h-11 px-5 text-base"
            disabled={locked}
          >
            {busy ? l.busy : collection ? l.save : l.create}
          </Button>
        )}
      </div>
    </form>
  );
}

// Users can rename later; use the selected source and URL/account identifier initially.
function defaultCollectionName(
  value: GuardCreateInput,
  labels: GuardLabels,
  accounts: YoutubeConnection[]
) {
  if (!needsSourceUrl(value.source))
    return `${labels[value.source]} · ${accounts.find((a) => a.id === value.connectionId)?.channelTitle || ''}`.slice(
      0,
      100
    );
  if (value.name.trim()) return value.name.trim();
  const raw = value.url.trim();
  let identifier = raw;
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    identifier =
      value.source === 'playlist' || value.source === 'private_playlist'
        ? url.searchParams.get('list') ||
          url.pathname.split('/').filter(Boolean).at(-1) ||
          raw
        : parts[0]?.startsWith('@')
          ? parts[0]
          : parts[1] || parts[0] || raw;
  } catch {
    // The API also accepts a raw playlist/channel ID and validates the source.
  }
  const source =
    value.source === 'private_playlist'
      ? labels.private_playlist
      : value.source === 'playlist'
        ? labels.public_playlist
        : labels.public_channel;
  return `${source} · ${identifier}`.slice(0, 100);
}
