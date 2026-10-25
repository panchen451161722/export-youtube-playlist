/** The public API deliberately does not distinguish private from missing playlists. */
export function isUnavailablePlaylistError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return (
    message.startsWith('playlist_not_found:') ||
    message === 'playlist_not_found'
  );
}
