export const GUARD_FREQUENCIES = [
  'hourly',
  'daily',
  'weekly',
  'biweekly',
  'monthly',
] as const;
export type GuardFrequency = (typeof GUARD_FREQUENCIES)[number];
export type GuardSource = 'playlist' | 'channel';
export type GuardItem = {
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
  items: GuardItem[];
};
export type GuardCollection = {
  id: string;
  name: string;
  source: GuardSource;
  url: string;
  frequency: GuardFrequency;
  enabled: boolean;
  notifyMissing: boolean;
  notifyAdded: boolean;
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
  frequency: GuardFrequency;
  notifyMissing: boolean;
  notifyAdded: boolean;
  emailDelivery: boolean;
};
export type GuardAction =
  | { action: 'start_trial' }
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
      emailDelivery?: boolean;
    }
  | { action: 'delete'; id: string };
