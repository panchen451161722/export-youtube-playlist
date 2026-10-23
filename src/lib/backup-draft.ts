import type { GuardPlanId } from '@/config/guard-plans';
import {
  GUARD_FREQUENCIES,
  type GuardFrequency,
} from '@/lib/playlist-guard/types';

const STORAGE_KEY = 'playlist-backup-draft';
const MAX_AGE = 2 * 60 * 60 * 1000;
export type BackupPreferences = {
  planId: GuardPlanId;
  frequency: GuardFrequency;
  notifyMissing: boolean;
  notifyAdded: boolean;
  notifyRestored: boolean;
};
export const DEFAULT_BACKUP_PREFERENCES: BackupPreferences = {
  planId: 'pro',
  frequency: 'daily',
  notifyMissing: true,
  notifyAdded: true,
  notifyRestored: true,
};
export type BackupDraft = {
  url: string;
  source: 'playlist';
  savedAt: number;
  preferences?: BackupPreferences;
  resume?: 'entry' | 'auth' | 'checkout';
  checkout?: { userId: string; returned: boolean };
};

export function playlistBackupUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      ![
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'youtu.be',
        'www.youtu.be',
      ].includes(url.hostname.toLowerCase())
    )
      return null;
    const id = url.searchParams.get('list') || '';
    return /^[A-Za-z0-9_-]{10,128}$/.test(id)
      ? `https://www.youtube.com/playlist?list=${id}`
      : null;
  } catch {
    return null;
  }
}

export function saveBackupDraft(input: string) {
  const url = playlistBackupUrl(input);
  if (!url || typeof window === 'undefined') return;
  try {
    // The playlist stays in this tab, outside analytics and navigation URLs.
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        url,
        source: 'playlist',
        savedAt: Date.now(),
        resume: 'entry',
      })
    );
  } catch {
    /* Backup remains accessible when browser storage is unavailable. */
  }
}

export function readBackupDraft(): BackupDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = JSON.parse(
      window.sessionStorage.getItem(STORAGE_KEY) || 'null'
    );
    if (
      !data ||
      typeof data.savedAt !== 'number' ||
      data.savedAt > Date.now() ||
      Date.now() - data.savedAt > MAX_AGE ||
      typeof data.url !== 'string'
    )
      return null;
    const url = playlistBackupUrl(data.url);
    if (!url) return null;
    const draft: BackupDraft = {
      url,
      source: 'playlist',
      savedAt: data.savedAt,
    };
    if (['entry', 'auth', 'checkout'].includes(data.resume))
      draft.resume = data.resume;
    const prefs = data.preferences;
    if (
      prefs &&
      ['lite', 'pro', 'ultra'].includes(prefs.planId) &&
      GUARD_FREQUENCIES.includes(prefs.frequency) &&
      ['notifyMissing', 'notifyAdded', 'notifyRestored'].every(
        (key) => typeof prefs[key] === 'boolean'
      )
    ) {
      draft.preferences = {
        planId: prefs.planId,
        frequency: prefs.frequency,
        notifyMissing: prefs.notifyMissing,
        notifyAdded: prefs.notifyAdded,
        notifyRestored: prefs.notifyRestored,
      };
    }
    if (
      typeof data.checkout?.userId === 'string' &&
      data.checkout.userId.length <= 128 &&
      typeof data.checkout.returned === 'boolean'
    )
      draft.checkout = {
        userId: data.checkout.userId,
        returned: data.checkout.returned,
      };
    return draft;
  } catch {
    return null;
  }
}

export function writeBackupDraft(draft: BackupDraft): boolean {
  const url = playlistBackupUrl(draft.url);
  if (!url || typeof window === 'undefined') return false;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...draft, url, source: 'playlist' })
    );
    return true;
  } catch {
    return false;
  }
}

/** Consume the entry request once. A paid return stays recoverable until completion. */
export function backupArrival(search: string) {
  let draft = readBackupDraft();
  const returned = new URLSearchParams(search).get('setup');
  if (draft && returned === 'cancel') {
    draft = { ...draft, checkout: undefined, resume: 'entry' };
  } else if (draft?.checkout && returned === 'success') {
    draft = {
      ...draft,
      resume: 'checkout',
      checkout: { ...draft.checkout, returned: true },
    };
  } else if (draft && returned === 'auth') {
    draft = { ...draft, resume: 'auth', checkout: undefined };
  }
  const open = !!draft?.resume;
  if (draft) {
    draft = {
      ...draft,
      resume: draft.checkout?.returned ? 'checkout' : undefined,
    };
    writeBackupDraft(draft);
  }
  return { draft, open, cancelled: returned === 'cancel' };
}

export function mayCompleteBackup(
  draft: BackupDraft | null,
  userId: string | undefined,
  limit: number
) {
  return !!(
    userId &&
    draft?.checkout?.returned &&
    draft.checkout.userId === userId &&
    limit > 0
  );
}

export function clearBackupDraft() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Optional storage. */
  }
}
