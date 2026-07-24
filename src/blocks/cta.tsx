import { ArrowUpRight, FileSpreadsheet } from 'lucide-react';

import { m } from '@/paraglide/messages.js';

export function CTA() {
  return (
    <section className="px-5 py-24 sm:px-8">
      <div className="border-border bg-card mx-auto max-w-[1280px] rounded-xl border px-6 py-14 sm:px-12 sm:py-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="bg-secondary text-foreground flex size-12 items-center justify-center rounded-lg">
            <FileSpreadsheet aria-hidden="true" className="size-6" />
          </span>
          <h2 className="text-foreground mt-7 text-3xl font-medium tracking-[-0.025em] text-balance sm:text-5xl">
            {m['landing.cta.headline']()}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-7 sm:text-lg">
            {m['landing.cta.subheadline']()}
          </p>
          <a
            href="#exporter"
            className="bg-primary text-primary-foreground hover:bg-primary/88 focus-visible:ring-ring mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-offset-2"
          >
            {m['landing.cta.button']()}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
