import type { ComponentType } from 'react';

import { m } from '@/paraglide/messages.js';
import { baseLocale, getLocale } from '@/paraglide/runtime.js';
import { ToolGuide } from '@/components/tools/tool-guide';

type GuideModule = {
  default: ComponentType;
  meta: { title: string; updated_at: string };
};

// Long-form tool guides: src/content/tool-guides/<tool-slug>.<locale>.mdx
const guides = import.meta.glob<GuideModule>('/src/content/tool-guides/*.mdx', {
  eager: true,
});

function loadGuide(slug: string, locale: string): GuideModule | null {
  return (
    guides[`/src/content/tool-guides/${slug}.${locale}.mdx`] ??
    guides[`/src/content/tool-guides/${slug}.${baseLocale}.mdx`] ??
    null
  );
}

/** Renders the MDX guide for a tool slug, or nothing when none exists. */
export function ToolGuideSection({ slug }: { slug: string }) {
  const guide = loadGuide(slug, getLocale());
  if (!guide) return null;
  const Content = guide.default;

  return (
    <ToolGuide
      title={guide.meta.title}
      updatedLabel={`${m['common.pages.last_updated']()}: ${guide.meta.updated_at}`}
    >
      <Content />
    </ToolGuide>
  );
}
