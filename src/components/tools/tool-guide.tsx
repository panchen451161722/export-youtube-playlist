import type { ReactNode } from 'react';
import { MDXProvider } from '@mdx-js/react';

import { mdxComponents } from '@/components/mdx-components';

export type ToolGuideProps = {
  title: string;
  updatedLabel: string;
  children: ReactNode;
};

/** Long-form, first-party guide rendered below a tool. */
export function ToolGuide({ title, updatedLabel, children }: ToolGuideProps) {
  return (
    <section className="border-border border-t px-5 py-20 sm:px-8 sm:py-24">
      <article className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-medium tracking-[-0.025em] text-balance sm:text-4xl">
          {title}
        </h2>
        <p className="text-muted-foreground mt-3 text-sm">{updatedLabel}</p>
        <div className="text-foreground/90 mt-6 text-[15px] leading-7">
          <MDXProvider components={mdxComponents}>{children}</MDXProvider>
        </div>
      </article>
    </section>
  );
}
