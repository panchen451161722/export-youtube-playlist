import { useId, useState } from 'react';
import { Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';

const faqItems = [
  {
    question: () => m['landing.faq.public_private.question'](),
    answer: () => m['landing.faq.public_private.answer'](),
  },
  {
    question: () => m['landing.faq.limit.question'](),
    answer: () => m['landing.faq.limit.answer'](),
  },
  {
    question: () => m['landing.faq.retention.question'](),
    answer: () => m['landing.faq.retention.answer'](),
  },
  {
    question: () => m['landing.faq.formats.question'](),
    answer: () => m['landing.faq.formats.answer'](),
  },
  {
    question: () => m['landing.faq.quota.question'](),
    answer: () => m['landing.faq.quota.answer'](),
  },
] as const;

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const id = useId();

  return (
    <section id="faq" className="bg-background scroll-mt-20 px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="text-foreground text-sm font-medium">
            {m['landing.faq.eyebrow']()}
          </p>
          <h2 className="mt-4 text-3xl font-medium tracking-[-0.025em] text-balance sm:text-5xl">
            {m['landing.faq.title']()}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-md text-base leading-7 sm:text-lg">
            {m['landing.faq.description']()}
          </p>
        </div>

        <div className="border-border overflow-hidden border-y">
          {faqItems.map(({ question, answer }, index) => {
            const isOpen = openIndex === index;
            const triggerId = `${id}-trigger-${index}`;
            const panelId = `${id}-panel-${index}`;

            return (
              <div key={index} className="border-b last:border-b-0">
                <h3>
                  <button
                    id={triggerId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="focus-visible:ring-ring/50 flex min-h-16 w-full items-center justify-between gap-5 rounded-lg py-5 text-left text-base font-medium outline-none focus-visible:ring-3 sm:text-lg"
                  >
                    {question()}
                    <Plus
                      aria-hidden="true"
                      className={cn(
                        'text-muted-foreground size-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
                        isOpen && 'rotate-45'
                      )}
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  hidden={!isOpen}
                  className="text-muted-foreground max-w-2xl pb-6 leading-7"
                >
                  {answer()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
