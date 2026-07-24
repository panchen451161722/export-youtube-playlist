# Public Tools Coverage and Data Parity Report

Date: 2026-07-23

Target: the 18 public-data tool pages listed in the saved reference-site
research for `https://export-youtube-playlist.vercel.app/tools/`.

The three reference links that send users to separate OAuth-based personal-data
export sites are not inner pages of this product and are intentionally excluded.

## Result

- Public tool routes: 18/18
- Tools meeting the 95% data-agreement threshold: 18/18
- Matched comparable cells: 8,483/8,501
- Overall data agreement: **99.79%**
- Lowest individual result: **99.62%**
- Coverage audit: passed
- Production SSR audit: 36/36 localized tool pages rendered with status 200

| Tool                                       | Matched | Compared | Agreement |
| ------------------------------------------ | ------: | -------: | --------: |
| YouTube Playlist Link Extractor            |      52 |       52 |      100% |
| YouTube Playlist Title Extractor           |      52 |       52 |      100% |
| YouTube Playlist Analyzer                  |     182 |      182 |      100% |
| Download YouTube Thumbnail                 |      16 |       16 |      100% |
| YouTube Tag Extractor                      |       3 |        3 |      100% |
| YouTube Description Extractor              |       9 |        9 |      100% |
| YouTube Embed Code Generator               |       1 |        1 |      100% |
| YouTube Region Restriction Checker         |       5 |        5 |      100% |
| YouTube Channel ID Finder                  |       5 |        5 |      100% |
| YouTube Channel to Playlist                |       2 |        2 |      100% |
| YouTube Subscribe Link Generator           |       3 |        3 |      100% |
| YouTube Channel Playlist Extractor         |     120 |      120 |      100% |
| YouTube Channel Video Link Extractor       |   2,760 |    2,760 |      100% |
| YouTube Channel Title Extractor            |     552 |      552 |      100% |
| Export YouTube Channel                     |   4,691 |    4,709 |    99.62% |
| YouTube Channel Analyzer                   |      13 |       13 |      100% |
| YouTube Channel Keywords                   |       7 |        7 |      100% |
| YouTube Channel Banner and Logo Downloader |      10 |       10 |      100% |

## Fixtures and comparison rules

- Playlist fixture:
  `PL-osiE80TeTskrapNbzXhwoFUiLCjGgY7`
- Video fixture: `YYXdXT2l-Gg`
- Channel fixture: `UCCezIgC97PvUuR4_gbFUs5g`
- Stable IDs, titles, URLs, channel names, timestamps, durations, descriptions,
  tags, assets, and export columns use exact matching.
- Time-varying playlist view counts allow a 1% relative difference.
- List-valued Channel Export cells compare case-insensitive content regardless
  of order because the reference implementation emits Python-set values in an
  unstable order.

## Reproduce

```bash
node --import tsx scripts/audit-public-tools-coverage.ts
node --import tsx scripts/compare-public-tools-reference.ts /private/tmp/ref-tool-data
# Set a non-production AUTH_SECRET in the shell first.
node --import tsx scripts/audit-public-tools-runtime.ts
```

The reference JSON fixtures are captured read-only test evidence. The comparison
script does not call the live reference site or expose the production YouTube API
key.
