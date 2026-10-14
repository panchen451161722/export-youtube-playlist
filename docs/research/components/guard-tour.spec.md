# Playlist demo revision — reference evidence

Reference: https://www.playlistguard.com/demo/ (read 2026-10-13). Source HTML saved to /tmp/playlistguard-reference.html after initial browser connections timed out. Browser subsequently recovered: live screenshots confirmed the 1100×750 window, list/card geometry, dark contained overlays and autoplay.

## Actual reference (not inferred from homepage)

- Centered small title “Interactive Product Tour” + one-line subtitle.
- 1100px wide, 750px tall window, 12px radius, 1px border, substantial shadow. Inner scrolling; modal overlays are contained within window.
- Initial list: header card title “Monitor YouTube or YouTube Music Playlist”, collection quota badge, Add New button. Three-column card grid (one initial card).
- Cards have header/name/public playlist/enabled + link icon, 2x2 frequency/tracking/items/missing fields, 3 equal footer buttons View/Update/Delete.
- Auto-running simulated cursor opens Add, selects Public Playlist, types URL, reveals frequency, notification toggles (removed/added/restored), email export with its frequency, then creates “Top Tracks 2026”.
- Detail is an inline screen in window, NOT a dialog. Header metadata + Back to Playlists / Export Data. Two tabs Missing Videos and Latest Version, numbers in badges.
- Missing screen two video rows with thumbnail/title/missing date; latest rows have 192px-wide thumbnail, title, duration/views, sort selector (default/title/views), pagination.
- Export modal radio selection latest or missing, then Export to Excel, preparation state. Tour resets and loops.
- Reference video IDs: dQw4w9WgXcQ, 9jK-NcRmVcw (missing); 1w7OgIMMRc4, lDK9QqIzhwk, hTWKbfoikeg, CSvFpBOe8eY (latest); kJQP7kiw5Fk, JGwWNGJdvx8, OPf0YbXqDm0, fRh_vgS2dFE, 09R8_2nJtjg (new). Images https://i.ytimg.com/vi/{id}/hqdefault.jpg.

## Adaptation requested

Keep site's existing cream background/navy primary/font tokens; replicate reference hierarchy, compact scale, cards, inline detail, dialogs, cursor-driven tour. Add pause/replay, step selection, manual mode. Autoplay must never actually download/send/create backend data. Manual export may download sample metadata. Manual input must pause autoplay; reduced-motion starts paused; timers cancel cleanly; mobile window width fits with scroll.

## Ownership

Root: tour state, forms, auto cursor, outer shell, route/block integration, translations.
Parallel builder: props-only collection list/detail renderer in src/components/playlist-guard/tour-views.tsx, plus independent typed seed/data helpers src/lib/playlist-guard/tour.ts and tests. Do not modify messages or existing workspace/demo data.
