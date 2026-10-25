import { z } from 'zod';

import type { GuardPlanId } from '@/config/guard-plans';
import { playlistBackupUrl } from '@/lib/backup-draft';
import { GUARD_FREQUENCIES } from '@/lib/playlist-guard/types';

export const guestBackupSchema = z
  .object({
    url: z
      .string()
      .max(2048)
      .transform(playlistBackupUrl)
      .refine(Boolean)
      .transform((value) => value!),
    source: z.enum(['playlist', 'private_playlist']).default('playlist'),
    planId: z.enum(['lite', 'pro', 'ultra']),
    frequency: z.enum(GUARD_FREQUENCIES),
    notifyMissing: z.boolean(),
    notifyAdded: z.boolean(),
    notifyRestored: z.boolean(),
  })
  .strict();
export const guestCheckoutSchema = z
  .object({
    locale: z.enum(['en', 'zh']).default('en'),
    backup: guestBackupSchema,
  })
  .strict();
export type GuestCheckoutInput = z.infer<typeof guestCheckoutSchema>;
export type GuestCheckoutStatus = {
  id: string;
  status:
    | 'pending'
    | 'paid'
    | 'trialing'
    | 'fulfilled'
    | 'claimed'
    | 'trial_cancel_pending'
    | 'trial_rejected'
    | 'abandoned';
  email: string;
  mailSent: boolean;
  backupSaved: boolean;
  needsYoutubeConnection: boolean;
  lastError: string | null;
  rejectionReason: 'trial_used' | 'existing_subscription' | null;
  planId: GuardPlanId;
};

export function guestPaths(id: string, locale: string) {
  const prefix = locale === 'zh' ? '/zh' : '';
  const query = `guest=${encodeURIComponent(id)}`;
  return {
    success: `${prefix}/youtube-playlist-backup?${query}`,
    cancel: `${prefix}/youtube-playlist-backup?${query}&setup=cancel`,
    claim: `${prefix}/claim-backup?purchase=${encodeURIComponent(id)}`,
  };
}
