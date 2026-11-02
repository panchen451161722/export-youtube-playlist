/** Limits for one-off public playlist exports; monitoring has separate limits. */
export const FREE_PLAYLIST_EXPORT_LIMIT = 500;
/** null means unlimited and survives JSON serialization without ambiguity. */
export const SUBSCRIBER_PLAYLIST_EXPORT_LIMIT = null;
export const SUBSCRIBER_CHANNEL_EXPORT_LIMIT = 5_000;

export type PlaylistExportAccess = {
  limit: number | null;
  subscribed: boolean;
};
