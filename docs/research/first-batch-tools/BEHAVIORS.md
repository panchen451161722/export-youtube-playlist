# First-batch tools — behavior specification

The reference website is used only to understand the workflow. The implementation
keeps Export YouTube Playlist's existing visual language, copy, API, privacy
positioning, and 500-video limit.

## Shared behavior

- Every tool accepts a public or API-accessible unlisted YouTube playlist URL.
- Submitting calls the existing `POST /api/youtube-playlist` endpoint through
  `apiPost` and TanStack Query.
- Empty or malformed URLs are rejected before an API call.
- Loading, empty, truncated, private/unavailable, quota, timeout, configuration,
  and generic network states are shown inline.
- The playlist is processed only after the user submits the form.
- Results remain on the current page. No sign-in is required.
- Each page links back to the full CSV/XLSX exporter and to the other live tools.

## Link extractor

- The primary result is one canonical `https://www.youtube.com/watch?v=...` URL
  per available video.
- The user can switch between `Links only` and `Title + link`.
- Results can be copied in one action or downloaded as UTF-8 TXT or CSV.
- CSV uses the reference-compatible `Index,URL` contract and escapes fields
  safely for spreadsheet applications.
- The result header reports the playlist title and available video count.

## Title extractor

- The primary result is one video title per available video.
- The user can switch between `Plain titles` and `Numbered titles`.
- Results can be copied in one action or downloaded as UTF-8 TXT or CSV.
- CSV uses the reference-compatible `Index,Title` contract.

## Playlist analyzer

- Summary metrics: available videos, total duration, average duration, unique
  channels, total and average views, likes, and comments.
- Watch-time estimates: 1x, 1.25x, 1.5x, and 2x.
- Detail summaries: longest video, shortest video, most-viewed videos, and top
  channels by video count.
- Missing YouTube statistics are excluded from numeric averages and displayed
  clearly rather than treated as API failures.
- The underlying per-video data can be downloaded as a comparison-friendly CSV
  with video ID, title, URL, channel, duration, engagement, and upload time.
- Version one uses metric cards and compact ranked lists, not complex charts.

## Reference-data acceptance gate

- Compare the same public playlist against the reference site and this project.
- Link and title exports must contain the same row count, order, and stable
  values.
- Analyzer comparison uses video ID as the primary key. ID, title, URL, channel,
  duration, and upload time are exact-match fields.
- Views, likes, and comments are time-varying and pass when their relative
  difference is at most 1%.
- The batch passes only when at least 95% of comparable cells match.
- Validation playlist on 2026-07-23:
  `PL-osiE80TeTskrapNbzXhwoFUiLCjGgY7`.
- Result: 26/26 rows matched; stable fields matched 100%; exact comparable-cell
  agreement was 97.0%; agreement with a 1% tolerance for live engagement
  counters was 100%.

## Accessibility and responsive behavior

- All form controls have visible labels and keyboard focus states.
- Success and error status uses `aria-live`.
- Copy/download buttons remain reachable on narrow screens.
- Results use wrapping/scrolling so long titles and URLs do not overflow.
- Tool navigation closes on outside click and Escape, matching the existing
  header behavior.
