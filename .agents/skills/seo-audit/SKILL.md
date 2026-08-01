---
name: seo-audit
description: "Audit and improve one or more public web pages for on-page SEO using target keywords, source/DOM evidence, and the seven-part Web.Cafe-style rubric: metadata, content quality, keyword alignment, links, media, social/structured data, and technical crawlability. Use when asked to review an SEO report, audit a URL, optimize an internal or tool page, validate Title/H1/Description/schema/indexing, compare pages for the same keyword, or implement and verify high-value on-page SEO fixes."
---

# SEO Audit

Audit against search intent and user value, not an automated score. Treat external graders as diagnostic evidence: verify every recommendation against the live page, source code, rendered DOM, and current search-engine guidance before changing anything.

## Required reference

Read [references/metrics.md](references/metrics.md) completely before auditing. It contains the seven-category checklist, interpretation rules, and false-positive guidance derived from `https://seo.web.cafe/audit/`.

## Workflow

### 1. Establish the target

Record:

- Page URL or local route
- Page type and intended user action
- Locale
- One primary search query and any secondary queries
- Whether the user wants analysis only or implementation

Write target keywords as natural search phrases. Convert a slug such as `export-youtube-channel` to `export youtube channel` unless search evidence shows users include the punctuation. Never submit a URL slug as the keyword merely because it appears in the path.

If the keyword or intent is ambiguous, infer it from the page, title, Search Console data, or supplied report. Ask only when competing interpretations would materially change the work.

### 2. Collect independent evidence

Use at least two evidence surfaces when available:

1. Run or read the Web.Cafe audit for the natural-language keyword.
2. Inspect the target page's HTML/rendered DOM and the implementation source.

When the user explicitly asks for OpenCLI, use it. A typical flow is:

```bash
opencli browser seo-audit open '<encoded audit URL>' --window background
opencli browser seo-audit wait time 15
opencli browser seo-audit extract
```

Otherwise, use the available HTTP, browser, or crawl tools. Do not bypass authentication or a user-selected browser.

Capture the page's:

- HTTP status, redirect chain, HTTPS, response time, and HTML size
- Title, meta description, canonical, robots directives, and `html[lang]`
- H1-H6 outline and opening copy
- Visible interactive controls and whether the primary task works on the page
- Internal/external links and anchor text
- Images/media, alt text, dimensions, and loading behavior
- Open Graph, Twitter card, and JSON-LD
- `robots.txt`, sitemap, hreflang, and server-rendered content

### 3. Validate the report before acting

Reject or downgrade a finding when direct evidence contradicts it.

Check these common failure modes first:

- **Keyword tokenization:** If Title, H1, and URL visibly contain the words but the report says 0%, rerun with spaces instead of hyphens.
- **Natural grammar:** Articles, prepositions, singular/plural forms, and close variants do not make a page irrelevant. Keep natural language such as `Export a YouTube channel` even when the query is `export youtube channel`.
- **Interactivity:** If the report says the page is a redirect-only landing page, verify the DOM for inputs, selects, upload controls, buttons, canvas, and on-page results before changing architecture.
- **Rendering:** Distinguish missing server HTML from a crawler that failed to wait for streamed or client-rendered content.
- **Heuristics:** Character counts, word counts, text/code ratio, keyword density, image presence, and outbound-link presence are not universal ranking requirements.

If the primary keyword was malformed, invalidate the keyword score and any overall score capped by it. Rerun before making recommendations.

### 4. Prioritize findings

Use this order:

1. **P0 — crawl/index blockers:** non-200 responses, accidental `noindex`, robots blocks, broken canonical, redirect loops, missing server content.
2. **P1 — intent and page purpose:** misleading or missing Title/H1, wrong query intent, weak opening explanation, primary task not available on-page, unusable mobile experience.
3. **P2 — comprehension and trust:** useful content gaps, duplicate metadata, poor internal linking, inaccurate schema, missing alt on meaningful images, locale/hreflang errors.
4. **P3 — optional polish:** possible title truncation, richer social cards, helpful screenshots, supplementary authoritative links.
5. **Ignore — score-only work:** forced exact-match grammar, filler added to hit a word count, keyword stuffing, decorative images or outbound links added only for points.

Prefer a small set of high-confidence changes over rewriting a page that already matches intent.

### 5. Report or implement

For an analysis request, do not edit files. Return a decision table:

| Finding | Evidence | Verdict | Recommended action | Priority |
| --- | --- | --- | --- | --- |

State the valid baseline score separately from any invalid or malformed-keyword run.

For an implementation request:

- Preserve natural, accurate copy; introduce an exact phrase only where it reads naturally.
- Keep every locale in sync.
- Make schema describe visible page content and actual functionality.
- Do not add content, images, or links without a user-facing purpose.
- Preserve unrelated working-tree changes.

For this TanStack Start project:

- Put page content in `messages/en.json` and `messages/zh.json`, accessed through Paraglide message functions.
- Keep translated zero-config content in `src/blocks/`; keep reusable prop-driven rendering in `src/components/`.
- Define route metadata through loaders and `head()` using the existing SEO helpers.
- Do not edit `src/routeTree.gen.ts` or `src/components/ui/*` manually.

### 6. Verify

After code changes:

1. Run `git diff --check`.
2. Run `pnpm build`.
3. Inspect the rendered route at relevant viewport sizes when presentation changed.
4. Confirm Title, description, canonical, headings, controls, and structured data in rendered output.
5. Re-run the external audit with the natural-language keyword after deployment.

Do not claim a new live score from local-only changes. Report build warnings separately from failures.

## Guardrails

- Do not promise rankings from an on-page score.
- Do not treat a fixed 60-character Title limit as a Google rule; judge concision and likely device-width truncation.
- Do not target a fixed word count. Add content only when it improves task completion, trust, differentiation, or answers a real follow-up question.
- Do not optimize to a rigid keyword density. Avoid repetition that sounds unnatural.
- Do not remove articles such as `a` or `the` merely to create an exact-match heading.
- Do not add an image or external link solely because the grader awards a point.
- Do not apply structured data that is unsupported by visible content or actual page behavior.
- Use current primary sources when a recommendation depends on changing search-engine behavior.
