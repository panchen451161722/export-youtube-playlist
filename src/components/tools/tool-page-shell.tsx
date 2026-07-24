import type { ReactNode } from 'react';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';

import type { ToolFaq, ToolLink, ToolStep } from './types';

export type ToolBreadcrumb = {
  label: string;
  href?: string;
};

export type ToolPageShellProps = {
  breadcrumbLabel: string;
  breadcrumbs: ToolBreadcrumb[];
  eyebrow: string;
  title: string;
  description: string;
  tool: ReactNode;
  stepsTitle: string;
  steps: ToolStep[];
  benefitsTitle: string;
  benefits: ToolStep[];
  faqTitle: string;
  faqs: ToolFaq[];
  relatedToolsTitle: string;
  relatedTools: ToolLink[];
  openToolLabel: string;
};

export function ToolPageShell({
  breadcrumbLabel,
  breadcrumbs,
  eyebrow,
  title,
  description,
  tool,
  stepsTitle,
  steps,
  benefitsTitle,
  benefits,
  faqTitle,
  faqs,
  relatedToolsTitle,
  relatedTools,
  openToolLabel,
}: ToolPageShellProps) {
  return (
    <main className="bg-background">
      <section className="px-5 pt-12 pb-16 sm:px-8 sm:pt-16 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <nav aria-label={breadcrumbLabel}>
            <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
              {breadcrumbs.map((item, index) => {
                const isCurrent = index === breadcrumbs.length - 1;

                return (
                  <li key={`${item.label}-${index}`} className="contents">
                    {index > 0 ? (
                      <ChevronRight
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                      />
                    ) : null}
                    {item.href && !isCurrent ? (
                      <Link
                        href={item.href}
                        className="hover:text-foreground focus-visible:ring-ring rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        className={isCurrent ? 'text-foreground' : undefined}
                        aria-current={isCurrent ? 'page' : undefined}
                      >
                        {item.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="mt-10 max-w-3xl">
            <p className="text-primary text-sm font-medium">{eyebrow}</p>
            <h1 className="mt-4 text-4xl font-medium tracking-[-0.035em] text-balance sm:text-6xl">
              {title}
            </h1>
            <p className="text-muted-foreground mt-6 max-w-2xl text-base leading-7 sm:text-lg">
              {description}
            </p>
          </div>

          <div className="mt-10 sm:mt-12">{tool}</div>
        </div>
      </section>

      <section className="border-border bg-muted/25 border-y px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-medium tracking-[-0.025em] text-balance sm:text-4xl">
            {stepsTitle}
          </h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={`${step.title}-${index}`}
                className="border-border bg-card rounded-xl border p-6 sm:p-7"
              >
                <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg text-sm font-semibold">
                  {index + 1}
                </span>
                <h3 className="mt-6 text-xl font-medium tracking-[-0.015em]">
                  {step.title}
                </h3>
                <p className="text-muted-foreground mt-3 leading-7">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <h2 className="text-3xl font-medium tracking-[-0.025em] text-balance sm:text-4xl">
              {benefitsTitle}
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {benefits.map((benefit, index) => (
              <article
                key={`${benefit.title}-${index}`}
                className="border-border bg-card rounded-xl border p-6"
              >
                <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                  <Check aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-medium">{benefit.title}</h3>
                <p className="text-muted-foreground mt-2 leading-6">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-border border-t px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-medium tracking-[-0.025em] text-balance sm:text-4xl">
            {faqTitle}
          </h2>
          <div className="divide-border mt-9 divide-y border-y">
            {faqs.map((faq, index) => (
              <details key={`${faq.question}-${index}`} className="group py-5">
                <summary className="focus-visible:ring-ring flex cursor-pointer list-none items-center justify-between gap-6 rounded-sm text-base font-medium focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground text-xl transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="text-muted-foreground max-w-2xl pt-4 pr-10 leading-7">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {relatedTools.length > 0 ? (
        <section className="border-border bg-muted/25 border-t px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-medium tracking-[-0.025em] text-balance sm:text-4xl">
              {relatedToolsTitle}
            </h2>
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {relatedTools.map((relatedTool) => (
                <Link
                  key={relatedTool.href}
                  href={relatedTool.href}
                  className="border-border bg-card hover:border-primary/35 group focus-visible:ring-ring rounded-xl border p-6 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <h3 className="text-lg font-medium">{relatedTool.title}</h3>
                  <p className="text-muted-foreground mt-2 leading-6">
                    {relatedTool.description}
                  </p>
                  <span className="text-primary mt-6 inline-flex items-center gap-2 text-sm font-medium">
                    {openToolLabel}
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
