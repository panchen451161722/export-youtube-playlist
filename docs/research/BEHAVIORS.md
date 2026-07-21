# Behavior specification

## Exporter state machine

1. **Idle:** URL input, 500-video free-limit note, and one primary `Preview playlist` action.
2. **Invalid:** reject malformed URLs and YouTube URLs without a `list` parameter before any network call.
3. **Loading:** disable the submit action, preserve the entered URL, and show progress language.
4. **Success:** display playlist title, returned/total item counts, truncation notice when applicable, preview rows, and CSV/XLSX/Copy Links actions.
5. **Empty:** explain that the playlist has no exportable public videos.
6. **Private or missing:** explain that private/deleted playlists cannot be read with the public API key.
7. **Quota:** identify temporary YouTube API quota exhaustion and encourage retrying later.
8. **Timeout/network:** show a retryable error without discarding the URL.
9. **Configuration:** if `YOUTUBE_API_KEY` is missing, return a safe server error that never exposes secrets.

## URL handling

- Accept `youtube.com/playlist?list=...`, `youtube.com/watch?...&list=...`, `music.youtube.com/...?...list=...`, and `youtu.be/...?...list=...`.
- Allow only HTTPS/HTTP and known YouTube hosts.
- Never fetch a user-provided host; all API requests target fixed Google API endpoints.

## Export rules

- Free cap: 500 playlist items.
- CSV and XLSX columns: Position, Title, Channel, Published At, Duration, Views, Video ID, URL.
- Neutralize spreadsheet-formula prefixes (`=`, `+`, `-`, `@`) in exported text cells.
- Generate exports in the browser after preview; do not persist playlist data.

## Monetization behavior

- Free plan is active.
- Pro is shown as `Coming soon`; no checkout is triggered until payment credentials and the plan are configured.
- AdSense slots remain disabled until content depth, traffic, and policy review are ready.
