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
    <section id="pricing" className="scroll-mt-20 px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-foreground text-sm font-medium">
            {m['landing.pricing.eyebrow']()}
          </p>
          <h2 className="mt-4 text-3xl font-medium tracking-[-0.025em] text-balance sm:text-5xl">
            {m['landing.pricing.title']()}
          </h2>
          <p className="text-muted-foreground mt-5 text-base leading-7 sm:text-lg">
            {m['landing.pricing.description']()}
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          <article className="border-border bg-card flex flex-col rounded-xl border p-7 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {m['landing.pricing.free.name']()}
                </p>
                <p className="mt-4 text-4xl font-medium tracking-[-0.025em]">
                  {m['landing.pricing.free.price']()}
                </p>
              </div>
              <span className="bg-secondary text-muted-foreground rounded-md px-3 py-1.5 text-xs font-medium">
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
              className="border-input bg-card hover:bg-secondary focus-visible:ring-ring/50 mt-9 inline-flex min-h-11 items-center justify-center rounded-lg border px-5 text-sm font-medium transition-colors outline-none focus-visible:ring-3"
            >
              {m['landing.pricing.free.button']()}
            </a>
          </article>

          <article className="bg-primary text-primary-foreground flex flex-col rounded-xl border border-black p-7 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles aria-hidden="true" className="size-4 text-white" />
                  {m['landing.pricing.pro.name']()}
                </p>
                <p className="mt-4 text-4xl font-medium tracking-[-0.025em]">
                  {m['landing.pricing.pro.price']()}
                </p>
              </div>
              <span className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
                {m['landing.pricing.pro.badge']()}
              </span>
            </div>
            <p className="mt-4 min-h-12 text-sm leading-6 text-white/65">
              {m['landing.pricing.pro.description']()}
            </p>
            <ul className="mt-8 space-y-4">
              {proFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                    <Check aria-hidden="true" className="size-3.5" />
                  </span>
                  <span className="text-white/85">{feature()}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled
              className="mt-9 inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 text-sm font-medium text-white/45"
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
