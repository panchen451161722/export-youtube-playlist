import { Download, Link2, ListChecks } from 'lucide-react';

import { m } from '@/paraglide/messages.js';

const steps = [
  {
    icon: Link2,
    title: () => m['landing.how.step_1.title'](),
    description: () => m['landing.how.step_1.description'](),
  },
  {
    icon: ListChecks,
    title: () => m['landing.how.step_2.title'](),
    description: () => m['landing.how.step_2.description'](),
  },
  {
    icon: Download,
    title: () => m['landing.how.step_3.title'](),
    description: () => m['landing.how.step_3.description'](),
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-muted/45 scroll-mt-24 border-y px-4 py-24 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-primary text-sm font-semibold tracking-[0.16em] uppercase">
            {m['landing.how.eyebrow']()}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            {m['landing.how.title']()}
          </h2>
          <p className="text-muted-foreground mt-5 text-base leading-7 sm:text-lg">
            {m['landing.how.description']()}
          </p>
        </div>

        <div className="relative mt-14">
          <div
            aria-hidden="true"
            className="bg-border absolute top-10 right-[17%] left-[17%] hidden h-px lg:block"
          />
          <ol className="relative grid gap-5 lg:grid-cols-3">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <li
                key={index}
                className="border-border/70 bg-background relative rounded-3xl border p-7 shadow-sm sm:p-8"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-2xl shadow-sm">
                    <Icon
                      aria-hidden="true"
                      className="size-6"
                      strokeWidth={1.8}
                    />
                  </span>
                  <span className="text-muted-foreground/45 text-5xl font-semibold tabular-nums">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-8 text-xl font-semibold">{title()}</h3>
                <p className="text-muted-foreground mt-3 leading-7">
                  {description()}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
