/** Limits for one-off public playlist exports; monitoring has separate limits. */
export const FREE_PLAYLIST_EXPORT_LIMIT = 500;
export const SUBSCRIBER_PLAYLIST_EXPORT_LIMIT = 5_000;

export type PlaylistExportAccess = {
  limit: number;
  subscribed: boolean;
};
