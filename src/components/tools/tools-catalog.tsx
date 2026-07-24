import type { ReactNode } from 'react';
import { ArrowRight, ChevronRight, ShieldCheck } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';

import type { ToolBreadcrumb } from './tool-page-shell';
import type { ToolLink } from './types';

export type ToolCatalogItem = ToolLink & {
  icon: ReactNode;
  actionLabel: string;
};

export type ToolsCatalogProps = {
  breadcrumbLabel: string;
  breadcrumbs: ToolBreadcrumb[];
  eyebrow: string;
  title: string;
  description: string;
  tools: ToolCatalogItem[];
  publicDataTitle: string;
  publicDataDescription: string;
};

export function ToolsCatalog({
  breadcrumbLabel,
  breadcrumbs,
  eyebrow,
  title,
  description,
  tools,
  publicDataTitle,
  publicDataDescription,
}: ToolsCatalogProps) {
  return (
    <main className="bg-background">
      <section className="px-5 pt-12 pb-20 sm:px-8 sm:pt-16 sm:pb-24">
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

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="border-border bg-card hover:border-primary/35 group focus-visible:ring-ring flex min-h-64 flex-col rounded-xl border p-7 transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:outline-none sm:p-8"
              >
                <span
                  aria-hidden="true"
                  className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-lg [&_svg]:size-6"
                >
                  {tool.icon}
                </span>
                <h2 className="mt-8 text-2xl font-medium tracking-[-0.02em]">
                  {tool.title}
                </h2>
                <p className="text-muted-foreground mt-3 leading-7">
                  {tool.description}
                </p>
                <span className="text-primary mt-auto inline-flex items-center gap-2 pt-8 text-sm font-medium">
                  {tool.actionLabel}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            ))}
          </div>

          <aside className="border-border bg-muted/35 mt-12 flex flex-col gap-5 rounded-xl border p-7 sm:flex-row sm:items-start sm:p-8">
            <span className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-lg">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-medium">{publicDataTitle}</h2>
              <p className="text-muted-foreground mt-2 max-w-3xl leading-7">
                {publicDataDescription}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
