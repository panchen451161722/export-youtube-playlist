# Font loading and layout stability

Status: deployed and smoke-tested on 2026-10-27 UTC (2026-10-26 Los Angeles).

Cloudflare version: `c49cd936-677e-40d5-8a40-e3d4add94b67`.
Previous version: `fcc52659-0c04-432a-a9d2-ec1dd096bfd7`.

The reported Clarity homepage recording has CLS 0.36. A Chrome Performance
recording of the live homepage reproduced CLS 0.04 and identified **Web font**
as a layout-shift culprit, with the worst cluster around 1.02 seconds. This
confirms a font-loading contribution, not that every shift in the historical
Clarity recording has the same cause.

Changes:

- Preload the existing self-hosted Inter Latin variable font in the root head.
- Keep all seven existing Inter subsets and weights, using `font-display:
optional` instead of `swap`. When the font arrives too late, retain the
  fallback for that navigation instead of moving already-visible text.
- No changes to prices, registration, checkout, advertising configuration, or
  the existing Clarity privacy boundaries.

Local verification used the production build, an uncached loopback proxy that
delayed `.woff2` responses by three seconds, and Chrome's `layout-shift`
PerformanceObserver (excluding recent-input shifts and computing the largest
session window). Diagnostic output was confined to the local test page.

| Page / viewport            |       Before | After |
| -------------------------- | -----------: | ----: |
| Homepage, 1098 × 463       |     0.000932 |     0 |
| Homepage, 543 × 463        |     0.001219 |     0 |
| Homepage, 390 × 844        | Not measured |     0 |
| Homepage, 1440 × 844       | Not measured |     0 |
| Channel export, 1440 × 844 | Not measured |     0 |

Production build, TypeScript checks, and all 25 privacy/analytics/backup-draft
regression tests passed. The generated font preload
returned HTTP 200, and the generated CSS contained seven optional font faces
and no swap faces. These lab measurements are not a before/after comparison of
real-user Clarity data. The historical recording's CLS 0.36 is not evidence that
all real-user causes have been removed; assess new field data separately.

Post-deployment verification:

- The live homepage preloads the font successfully; its served CSS has seven
  `font-display:optional` faces and no `swap` faces.
- Chrome Performance, anonymous incognito browser, cache disabled: desktop
  1440 × 844 reported CLS **0**, LCP **1.39 s**; mobile 390 × 844 reported CLS
  **0.00**, LCP **0.81 s**. These are individual lab runs, not field percentiles.
- Production build, type checking and 25 regression tests passed. The worktree
  security scanner checked 63 changed files and reported no findings.
- Public config, robots.txt and sitemap.xml returned successfully. All twelve
  HTML/CSP checks passed, including the existing German-to-English backup route
  redirect, after following redirects.

Reference: [Chrome guidance on preloading optional fonts](https://web.dev/articles/preload-optional-fonts).
