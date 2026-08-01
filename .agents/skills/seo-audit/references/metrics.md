# Web.Cafe-derived on-page SEO rubric

Use this reference to interpret the seven categories reported by `https://seo.web.cafe/audit/`. The site is a useful diagnostic surface, not an authority on ranking. Verify its findings against the page and current primary search-engine documentation.

## Contents

1. [Input validation](#1-input-validation)
2. [Meta information](#2-meta-information)
3. [Content quality](#3-content-quality)
4. [Keyword alignment](#4-keyword-alignment)
5. [Links](#5-links)
6. [Images and media](#6-images-and-media)
7. [Social and structured data](#7-social-and-structured-data)
8. [Technical and crawlability](#8-technical-and-crawlability)
9. [Scoring interpretation](#9-scoring-interpretation)

## 1. Input validation

Before interpreting a score:

- Use the real query phrase: `export youtube channel`, not the URL slug `export-youtube-channel`.
- Confirm the requested locale matches the page language.
- Confirm the URL is canonical and publicly reachable.
- Note whether multiple keywords were submitted; the tool may use the most focused keyword for the overall score.
- Check whether the report was generated from raw HTML, rendered DOM, or cached content.

If a report says the Title, H1, description, opening copy, and URL all have 0% coverage despite visible matches, assume tokenization or stale-crawl failure until a corrected run proves otherwise.

## 2. Meta information

### Title

Check that the `<title>` is present, unique, descriptive, concise, and aligned with the primary intent. Put the core topic early when natural. Treat 50-60 characters as a display heuristic, not a hard limit; Google truncates title links to available device width and may rewrite them.

Do not shorten a clear title merely to satisfy a character counter. Consider shortening when important differentiators or the brand suffix are repeatedly truncated or Search Console CTR suggests a problem.

### Meta description

Check that it is unique, accurate, useful, and gives a reason to click. A roughly 120-160 character English description is often readable, but no fixed range guarantees display or ranking. Avoid repeating the Title without adding value.

### Canonical

Require one valid canonical for indexable pages. It should normally self-reference the preferred localized URL and use the final HTTPS origin. Flag canonical chains, wrong locales, query-string accidents, or canonicals pointing to unrelated pages.

### Robots directives

Flag accidental `noindex`, `nofollow`, snippet restrictions, or conflicts between HTML and HTTP headers. Do not flag intentional noindex pages such as private dashboards.

### Baseline document metadata

Check viewport, charset, `html[lang]`, and favicon. Missing viewport is a real mobile issue. A wrong language declaration can harm accessibility and localization. A favicon is useful branding but not a content-quality fix.

## 3. Content quality

### H1 and heading outline

Prefer one clear visual H1 that accurately summarizes the page. Use a logical H2/H3 hierarchy. Do not force the exact query if it makes the heading ungrammatical; close variants and stop words are acceptable.

### Content depth

The audit may recommend 1,200-1,800 English words. Treat this only as its house heuristic. Google states that it has no preferred word count. A focused tool page can be complete with much less copy.

Add content when it answers genuine needs such as:

- What the tool exports or calculates
- Supported inputs, outputs, formats, and limits
- Privacy, storage, freshness, and data sources
- Common failure cases
- Examples, workflows, or use cases
- Differences from adjacent tools

Do not add filler sections to reach a threshold.

### Rendering

Confirm that search engines receive meaningful HTML on the initial response. Distinguish true client-only content from streamed SSR or a grader that did not wait. Inspect view-source and rendered DOM when they disagree.

### Demand fulfillment

For tools, confirm the primary task can be completed on the audited URL. Inspect actual controls and results. Inputs, selects, upload controls, canvas, buttons, and forms may be missed by simplistic detectors. A false negative here is not a reason to rebuild a working page.

### Text/code ratio

Treat text/code ratio as diagnostic only. Modern framework markup and hydration payloads can produce a low ratio without harming relevance. Investigate only when it accompanies thin or missing server-rendered content.

## 4. Keyword alignment

### Theme focus

Judge whether the page satisfies the query's meaning. Exact-string matching is secondary. Consider synonyms, articles, inflections, plurals, and entity relationships.

### Placement checks

Review whether the topic appears naturally in:

- Title
- Meta description
- H1
- At least one useful H2/H3 when appropriate
- URL slug
- Opening copy
- Body copy

Missing a phrase from one field is not automatically a problem when the page is otherwise clear. Avoid duplicating the same exact phrase in every heading.

### Exact phrases and density

An exact multi-word query can appear once or a few times when natural. Never rewrite a grammatical H1 such as `Export a YouTube channel` to the awkward `Export YouTube Channel` solely for exact matching.

The tool's n-gram and density lists are useful for spotting accidental topic drift or repetition. They are not fixed ranking targets. Navigation and related-tool menus can inflate generic words, so separate main content from sitewide chrome when possible.

### SERP and sitelinks signals

Treat sitelinks in competing results as a rough authority/brand signal, not proof of keyword difficulty. For meaningful competitive analysis, compare relevant ranking pages, Search Console queries, backlinks/authority, freshness, format, and intent match.

## 5. Links

### Internal links

Ensure the page is discoverable and links to genuinely related pages with descriptive anchors. More links are not automatically better. Avoid orphan pages, broken links, repetitive boilerplate, and misleading anchors.

### External links

Use descriptive anchors and `noopener` for new-window links. The absence of external links is not an SEO defect. Add authoritative sources only when they help users verify data, understand methodology, or continue a task.

## 6. Images and media

Meaningful images need descriptive alt text, intrinsic dimensions, responsive sizing, and appropriate loading behavior. Decorative images should use empty alt text.

A tool page does not need an `<img>` merely for a point. Add screenshots, diagrams, previews, or examples only when they explain the workflow, show expected output, reduce uncertainty, or create useful image-search value.

## 7. Social and structured data

### Social metadata

Check `og:title`, `og:description`, `og:image`, and an appropriate Twitter/X card. Ensure the image resolves publicly and has suitable dimensions. Social metadata affects sharing presentation, not direct on-page relevance.

### JSON-LD

Validate syntax and ensure every entity matches visible content and actual behavior. Common relevant types include `WebApplication`, `SoftwareApplication`, `BreadcrumbList`, `Article`, and eligible FAQ markup.

Do not add schema solely for points. Rich-result eligibility is separate from schema validity and can change; verify current Google documentation before promising display enhancements.

## 8. Technical and crawlability

### Transport and status

Require HTTPS and a successful final response. Flag redirect chains, loops, soft 404s, intermittent failures, and mismatches between canonical and final URL.

### Response speed and HTML size

Use response time and document size as triage signals. A fast HTML download does not prove good Core Web Vitals. Use field data or a browser performance trace for LCP, INP, and CLS.

### URL quality

Prefer stable, readable, lowercase paths with meaningful words. Avoid needless parameters and duplicate URL variants. Do not change an established URL without a redirect and migration plan.

### Internationalization

For localized pages, verify reciprocal hreflang links, valid locale codes, an `x-default` when appropriate, locale-correct canonicals, and matching `html[lang]`.

### robots.txt and sitemap

Require an accessible `robots.txt` and a sitemap that lists canonical public URLs. Ensure robots rules do not block resources required to render or public routes meant to rank. Exclude private, admin, account, and API routes from the sitemap.

## 9. Scoring interpretation

- Record the score and timestamp as a baseline, not a promise of ranking.
- If keyword parsing is invalid, discard the keyword section and any total-score cap derived from it.
- Separate objective failures from heuristics and optional opportunities.
- Prefer evidence-backed P0/P1 fixes over chasing the last few points.
- After local changes, verify build and rendered output. Re-score only after deployment and recrawl.
- Compare before/after using the same canonical URL, locale, natural-language keyword, and audit method.

Recommended reporting columns:

| Finding | Direct evidence | Tool result | Verdict | Action | Priority |
| --- | --- | --- | --- | --- | --- |
