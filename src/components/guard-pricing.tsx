import {
  ArrowRight,
  Check,
  ChevronRight,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import type { GuardPlanId } from '@/config/guard-plans';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export type GuardPricingContent = {
  eyebrow: string;
  title: string;
  description: string;
  annualBilling: string;
  trial: string;
  trialNote: string;
  demo: string;
  recommended: string;
  buy: string;
  buying: string;
  checkoutUnavailable: string;
  checkoutLoading: string;
  footerNote: string;
  freeTitle: string;
  freeDescription: string;
  freeLink: string;
  comparisonTitle: string;
  comparisonDescription: string;
  featureLabel: string;
  supportNote: string;
  faqTitle: string;
  faq: { question: string; answer: string }[];
  plans: {
    id: GuardPlanId;
    name: string;
    description: string;
    price: string;
    period: string;
    collectionLabel: string;
    features: string[];
  }[];
  comparison: { feature: string; values: string[] }[];
};

export function GuardPricing({
  content,
  onBuy,
  pendingPlan,
  checkoutAvailable,
  checkoutLoading,
  asPage,
}: {
  content: GuardPricingContent;
  onBuy: (id: GuardPlanId) => void;
  pendingPlan?: GuardPlanId;
  checkoutAvailable: boolean;
  checkoutLoading: boolean;
  asPage?: boolean;
}) {
  const Heading = asPage ? 'h1' : 'h2';
  return (
    <section id="pricing" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-[1180px]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-primary inline-flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {content.eyebrow}
          </p>
          <Heading className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl sm:leading-[1.15]">
            {content.title}
          </Heading>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-base leading-7 sm:text-lg">
            {content.description}
          </p>
          <Link
            href="/demo"
            className="text-primary mt-5 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
          >
            {content.demo}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <p className="text-muted-foreground mt-9 text-sm font-medium">
            {content.annualBilling}
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {content.plans.map((plan) => {
            const highlighted = plan.id === 'pro';
            return (
              <article
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border p-7 sm:p-8',
                  highlighted
                    ? 'border-primary bg-primary text-primary-foreground shadow-primary/10 shadow-xl'
                    : 'border-border bg-card'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {highlighted && (
                    <span className="border-primary-foreground/20 bg-primary-foreground/10 rounded-full border px-3 py-1 text-[11px] font-semibold">
                      {content.recommended}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'mt-3 min-h-12 text-sm leading-6',
                    highlighted
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  )}
                >
                  {plan.description}
                </p>
                <div className="mt-7 flex flex-wrap items-baseline gap-1.5">
                  <span className="text-5xl font-semibold tracking-[-0.04em] tabular-nums">
                    {plan.price}
                  </span>
                  <span
                    className={cn(
                      'text-sm',
                      highlighted
                        ? 'text-primary-foreground/65'
                        : 'text-muted-foreground'
                    )}
                  >
                    {plan.period}
                  </span>
                </div>
                <p className="mt-5 text-sm font-semibold">
                  {plan.collectionLabel}
                </p>
                <ul
                  className={cn(
                    'mt-6 flex-1 space-y-3.5 border-t pt-6',
                    highlighted
                      ? 'border-primary-foreground/15'
                      : 'border-border'
                  )}
                >
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-6">
                      <Check
                        className={cn(
                          'mt-1 size-4 shrink-0',
                          highlighted
                            ? 'text-primary-foreground/70'
                            : 'text-primary'
                        )}
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {checkoutAvailable ? (
                  <button
                    type="button"
                    disabled={!!pendingPlan}
                    onClick={() => onBuy(plan.id)}
                    className={cn(
                      'focus-visible:ring-ring/50 mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold outline-none hover:opacity-85 focus-visible:ring-3 disabled:cursor-wait disabled:opacity-60',
                      highlighted
                        ? 'bg-background text-foreground'
                        : 'bg-primary text-primary-foreground'
                    )}
                  >
                    {pendingPlan === plan.id ? (
                      <>
                        <LoaderCircle
                          className="size-4 animate-spin"
                          aria-hidden="true"
                        />
                        {content.buying}
                      </>
                    ) : (
                      content.trial
                    )}
                  </button>
                ) : (
                  <p
                    className={cn(
                      'mt-4 text-center text-xs leading-5',
                      highlighted
                        ? 'text-primary-foreground/60'
                        : 'text-muted-foreground'
                    )}
                  >
                    {checkoutLoading
                      ? content.checkoutLoading
                      : content.checkoutUnavailable}
                  </p>
                )}
              </article>
            );
          })}
        </div>
        <p className="text-muted-foreground mt-6 text-center text-sm leading-6">
          {content.trialNote}
        </p>
        <p className="text-muted-foreground mt-1 text-center text-xs leading-5">
          {content.footerNote}
        </p>

        <div className="border-border bg-card mt-12 flex flex-col items-start justify-between gap-5 rounded-2xl border p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h3 className="text-base font-semibold">{content.freeTitle}</h3>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
              {content.freeDescription}
            </p>
          </div>
          <Link
            href="/#exporter"
            className="border-border hover:bg-secondary focus-visible:ring-ring/50 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-5 text-sm font-semibold outline-none focus-visible:ring-3"
          >
            {content.freeLink}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {asPage && (
          <>
            <div className="mt-24">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
                  {content.comparisonTitle}
                </h2>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                  {content.comparisonDescription}
                </p>
              </div>
              <div
                role="region"
                aria-label={content.comparisonTitle}
                tabIndex={0}
                className="border-border bg-card focus-visible:ring-ring/50 mt-8 overflow-x-auto rounded-2xl border outline-none focus-visible:ring-3"
              >
                <table className="w-full min-w-[650px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-border border-b">
                      <th scope="col" className="px-6 py-5 font-medium">
                        {content.featureLabel}
                      </th>
                      {content.plans.map((plan) => (
                        <th
                          key={plan.id}
                          scope="col"
                          className={cn(
                            'px-5 py-5 text-center font-semibold',
                            plan.id === 'pro' && 'bg-secondary/50'
                          )}
                        >
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {content.comparison.map((row) => (
                      <tr
                        key={row.feature}
                        className="border-border border-b last:border-b-0"
                      >
                        <th
                          scope="row"
                          className="text-muted-foreground px-6 py-4 font-normal"
                        >
                          {row.feature}
                        </th>
                        {row.values.map((value, i) => (
                          <td
                            key={i}
                            className={cn(
                              'px-5 py-4 text-center',
                              i === 1 && 'bg-secondary/50'
                            )}
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground mt-4 text-xs leading-6">
                {content.supportNote}
              </p>
            </div>
            <div className="mx-auto mt-24 max-w-3xl">
              <h2 className="text-center text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
                {content.faqTitle}
              </h2>
              <Accordion className="mt-8" defaultValue={['faq-0']}>
                {content.faq.map((faq, index) => (
                  <AccordionItem
                    key={faq.question}
                    value={`faq-${index}`}
                    className="border-border py-3"
                  >
                    <AccordionTrigger className="text-base">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pr-8 text-sm leading-7">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
