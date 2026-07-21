import { Check, Clock3, Sparkles } from 'lucide-react';

import { m } from '@/paraglide/messages.js';

const freeFeatures = [
  () => m['landing.pricing.free.feature_limit'](),
  () => m['landing.pricing.free.feature_formats'](),
  () => m['landing.pricing.free.feature_preview'](),
] as const;

const proFeatures = [
  () => m['landing.pricing.pro.feature_limit'](),
  () => m['landing.pricing.pro.feature_history'](),
  () => m['landing.pricing.pro.feature_priority'](),
] as const;

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-primary text-sm font-semibold tracking-[0.16em] uppercase">
            {m['landing.pricing.eyebrow']()}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            {m['landing.pricing.title']()}
          </h2>
          <p className="text-muted-foreground mt-5 text-base leading-7 sm:text-lg">
            {m['landing.pricing.description']()}
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          <article className="border-border/70 bg-card flex flex-col rounded-3xl border p-7 shadow-sm sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  {m['landing.pricing.free.name']()}
                </p>
                <p className="mt-4 text-4xl font-semibold tracking-tight">
                  {m['landing.pricing.free.price']()}
                </p>
              </div>
              <span className="bg-muted text-muted-foreground rounded-full px-3 py-1.5 text-xs font-semibold">
                {m['landing.pricing.free.badge']()}
              </span>
            </div>
            <p className="text-muted-foreground mt-4 min-h-12 text-sm leading-6">
              {m['landing.pricing.free.description']()}
            </p>
            <ul className="mt-8 space-y-4">
              {freeFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <span className="bg-primary/9 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                    <Check aria-hidden="true" className="size-3.5" />
                  </span>
                  <span>{feature()}</span>
                </li>
              ))}
            </ul>
            <a
              href="#exporter"
              className="border-input bg-background hover:bg-accent focus-visible:ring-ring/50 mt-9 inline-flex min-h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold transition-colors outline-none focus-visible:ring-3"
            >
              {m['landing.pricing.free.button']()}
            </a>
          </article>

          <article className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-7 text-white shadow-xl shadow-slate-950/10 sm:p-9">
            <div
              aria-hidden="true"
              className="absolute -top-24 -right-20 size-64 rounded-full bg-blue-500/20 blur-3xl"
            />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles
                    aria-hidden="true"
                    className="size-4 text-blue-300"
                  />
                  {m['landing.pricing.pro.name']()}
                </p>
                <p className="mt-4 text-4xl font-semibold tracking-tight">
                  {m['landing.pricing.pro.price']()}
                </p>
              </div>
              <span className="rounded-full border border-blue-300/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200">
                {m['landing.pricing.pro.badge']()}
              </span>
            </div>
            <p className="relative mt-4 min-h-12 text-sm leading-6 text-slate-300">
              {m['landing.pricing.pro.description']()}
            </p>
            <ul className="relative mt-8 space-y-4">
              {proFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-400/15 text-blue-200">
                    <Check aria-hidden="true" className="size-3.5" />
                  </span>
                  <span className="text-slate-200">{feature()}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled
              className="relative mt-9 inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 text-sm font-semibold text-slate-400"
            >
              <Clock3 aria-hidden="true" className="size-4" />
              {m['landing.pricing.pro.button']()}
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}
