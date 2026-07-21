import { BadgeCheck, FileSpreadsheet, UserRoundX } from 'lucide-react';

import { m } from '@/paraglide/messages.js';

const proofItems = [
  {
    icon: UserRoundX,
    title: () => m['landing.proof.no_account.title'](),
    description: () => m['landing.proof.no_account.description'](),
  },
  {
    icon: BadgeCheck,
    title: () => m['landing.proof.official_api.title'](),
    description: () => m['landing.proof.official_api.description'](),
  },
  {
    icon: FileSpreadsheet,
    title: () => m['landing.proof.local_files.title'](),
    description: () => m['landing.proof.local_files.description'](),
  },
] as const;

export function ProofStrip() {
  return (
    <section
      aria-label={m['landing.proof.label']()}
      className="relative z-10 -mt-7 px-4 sm:-mt-9"
    >
      <div className="border-border/70 bg-background/95 mx-auto grid max-w-5xl overflow-hidden rounded-2xl border shadow-[0_18px_55px_-30px_rgba(15,23,42,0.4)] backdrop-blur sm:grid-cols-3">
        {proofItems.map(({ icon: Icon, title, description }, index) => (
          <div
            key={index}
            className="flex min-h-28 items-start gap-4 border-b p-5 last:border-b-0 sm:border-r sm:border-b-0 sm:p-6 sm:last:border-r-0"
          >
            <span className="bg-primary/8 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-sm font-semibold">{title()}</span>
              <span className="text-muted-foreground mt-1 block text-sm leading-5">
                {description()}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
