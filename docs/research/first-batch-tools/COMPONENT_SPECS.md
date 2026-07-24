# First-batch tools — component specifications

## `ToolPageShell`

- Presentation-only component.
- Receives breadcrumb, title, description, eyebrow, interactive tool content,
  steps, benefits, FAQs, and related live tools as props.
- Uses the current marketing palette and responsive width system.
- Renders semantic sections and an accessible FAQ accordion without reading
  translations directly.

## `ToolsCatalog`

- Presentation-only component.
- Receives intro copy and live tool cards as props.
- Each card has an icon, name, description, and locale-aware link.
- Does not create links to unimplemented tool pages.

## `PlaylistExtractionTool`

- Presentation-only client component with mode `links` or `titles`.
- Receives every visible label/message as props.
- Uses TanStack Query `useMutation` and `apiPost<PlaylistExport>`.
- Implements client-side URL validation, copy, TXT download, and CSV download.
- Reuses the API result types from `src/components/tools/types.ts`.

## `PlaylistAnalyzerTool`

- Presentation-only client component.
- Receives every visible label/message as props.
- Uses TanStack Query `useMutation` and `apiPost<PlaylistExport>`.
- Delegates metric calculation to pure functions in
  `src/components/tools/playlist-tool-utils.ts`.
- Does not render a charting dependency in version one.

## Visual contract

- Canvas: the existing `bg-background` / `marketing-shell`.
- Cards: rounded corners, subtle borders, `bg-card`, restrained shadow.
- Main action: current primary button treatment.
- Content width: no wider than the current `max-w-6xl` marketing layout.
- Mobile: single-column cards and full-width actions.
- Dark theme: use existing semantic tokens or the current header's explicit dark
  variants; no light-only surfaces.
