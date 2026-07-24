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
      className="bg-background px-5 pb-12 sm:px-8 sm:pb-16"
    >
      <div className="border-border bg-card mx-auto grid max-w-[1280px] overflow-hidden rounded-xl border sm:grid-cols-3">
        {proofItems.map(({ icon: Icon, title, description }, index) => (
          <div
            key={index}
            className="border-border flex min-h-28 items-start gap-4 border-b p-5 last:border-b-0 sm:border-r sm:border-b-0 sm:p-6 sm:last:border-r-0"
          >
            <span className="bg-secondary text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
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
