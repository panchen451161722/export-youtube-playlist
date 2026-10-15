export const GUARD_FREQUENCIES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
] as const;
export type GuardFrequency = (typeof GUARD_FREQUENCIES)[number];
export const GUARD_SOURCES = [
  'playlist',
  'private_playlist',
  'liked_videos',
  'liked_music',
  'channel',
  'subscriptions',
] as const;
export type GuardSource = (typeof GUARD_SOURCES)[number];
export const needsYoutubeAccount = (source: GuardSource) =>
  !['playlist', 'channel'].includes(source);
export const needsSourceUrl = (source: GuardSource) =>
  ['playlist', 'private_playlist', 'channel'].includes(source);
export type GuardItem = {
  kind?: 'video' | 'channel';
  id: string;
  title: string;
  channel: string;
  url: string;
  thumbnail: string;
  duration: string;
  position: number;
  /** Absent in older snapshots or when YouTube does not report statistics. */
  views?: number;
};
export type GuardMissingItem = GuardItem & { missingSince: string };
export type GuardSnapshot = {
  id: string;
  createdAt: string;
  itemCount: number;
  added: number;
  removed: number;
  /** Older snapshots predate separate restored-item counts. */
  restored?: number;
  items: GuardItem[];
};
export type GuardCollection = {
  id: string;
  name: string;
  /** Latest channel title from a successful YouTube scan. */
  sourceTitle?: string;
  source: GuardSource;
  connectionId?: string;
  url: string;
  frequency: GuardFrequency;
  enabled: boolean;
  notifyMissing: boolean;
  notifyAdded: boolean;
  /** Absent in older collections; treated as off until explicitly enabled. */
  notifyRestored?: boolean;
  emailDelivery: boolean;
  createdAt: string;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  lastError: string | null;
  itemCount: number;
  missingCount: number;
  runCount: number;
};
export type GuardCollectionDetail = GuardCollection & {
  snapshots: GuardSnapshot[];
  missing: GuardMissingItem[];
  delivery?: {
    status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
    attempts: number;
    createdAt: string;
    sentAt: string | null;
    nextAttemptAt: string | null;
    lastError: string | null;
  } | null;
};
export type GuardEntitlement = {
  plan: 'free' | 'trial' | 'lite' | 'pro' | 'ultra';
  limit: number;
  trialEndsAt: string | null;
  canStartTrial: boolean;
};
export type GuardOverview = {
  collections: GuardCollection[];
  entitlement: GuardEntitlement;
  capabilities: {
    youtube: boolean;
    email: boolean;
    emailPreview?: boolean;
    scheduler: boolean;
    privateSources: boolean;
  };
};
export type GuardCreateInput = {
  name: string;
  url: string;
  source: GuardSource;
  connectionId?: string;
  frequency: GuardFrequency;
  notifyMissing: boolean;
  notifyAdded: boolean;
  notifyRestored?: boolean;
  emailDelivery: boolean;
};
export type GuardAction =
  | ({ action: 'create' } & GuardCreateInput)
  | { action: 'sync'; id: string }
  | {
      action: 'update';
      id: string;
      name?: string;
      enabled?: boolean;
      frequency?: GuardFrequency;
      notifyMissing?: boolean;
      notifyAdded?: boolean;
      notifyRestored?: boolean;
      emailDelivery?: boolean;
    }
  | { action: 'delete'; id: string };
