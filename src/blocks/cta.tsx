import { ArrowUpRight, FileSpreadsheet } from 'lucide-react';

import { m } from '@/paraglide/messages.js';

export function CTA() {
  return (
    <section className="px-4 py-24 sm:py-28">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-14 text-white shadow-2xl shadow-slate-950/15 sm:px-12 sm:py-20">
        <div
          aria-hidden="true"
          className="absolute -top-24 right-0 size-72 rounded-full bg-blue-500/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -left-16 size-72 rounded-full bg-cyan-400/10 blur-3xl"
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-blue-200">
            <FileSpreadsheet aria-hidden="true" className="size-6" />
          </span>
          <h2 className="mt-7 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            {m['landing.cta.headline']()}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            {m['landing.cta.subheadline']()}
          </p>
          <a
            href="#exporter"
            className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-slate-950 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:ring-3 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transform-none"
          >
            {m['landing.cta.button']()}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
