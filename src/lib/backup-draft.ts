const STORAGE_KEY = 'playlist-backup-draft';
const MAX_AGE = 2 * 60 * 60 * 1000;
export type BackupDraft = { url: string; source: 'playlist'; savedAt: number };

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
      JSON.stringify({ url, source: 'playlist', savedAt: Date.now() })
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
    return url ? { url, source: 'playlist', savedAt: data.savedAt } : null;
  } catch {
    return null;
  }
}

export function clearBackupDraft() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Optional storage. */
  }
}
