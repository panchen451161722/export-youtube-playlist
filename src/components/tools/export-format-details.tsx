import type { ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  Download,
  FileSpreadsheet,
  Info,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { buttonVariants } from '@/components/ui/button';

type TextItem = {
  title: string;
  description: string;
};

type CompatibilityRow = {
  app: string;
  behavior: string;
  note: string;
};

type ExportFormatDetailsProps = {
  fieldReference: ReactNode;
  heading: string;
  description: string;
  useCases: TextItem[];
  fileTitle: string;
  fileDescription: string;
  facts: TextItem[];
  previewTitle: string;
  previewHeaders: string[];
  previewRow: string[];
  sampleHref: string;
  sampleLabel: string;
  sampleMeta: string;
  compatibilityTitle: string;
  compatibilityDescription: string;
  compatibilityHeaders: [string, string, string];
  compatibilityRows: CompatibilityRow[];
  limitationsTitle: string;
  limitations: string[];
  alternativeHref: string;
  alternativeLabel: string;
};

export function ExportFormatDetails({
  fieldReference,
  heading,
  description,
  useCases,
  fileTitle,
  fileDescription,
  facts,
  previewTitle,
  previewHeaders,
  previewRow,
  sampleHref,
  sampleLabel,
  sampleMeta,
  compatibilityTitle,
  compatibilityDescription,
  compatibilityHeaders,
  compatibilityRows,
  limitationsTitle,
  limitations,
  alternativeHref,
  alternativeLabel,
}: ExportFormatDetailsProps) {
  return (
    <>
      <section className="border-border bg-muted/25 border-y px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-medium tracking-[-0.025em] text-balance sm:text-4xl">
              {heading}
            </h2>
            <p className="text-muted-foreground mt-4 text-base leading-7 sm:text-lg">
              {description}
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {useCases.map((useCase) => (
              <article
                key={useCase.title}
                className="border-border bg-card rounded-xl border p-6 sm:p-7"
              >
                <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-lg">
                  <Check aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-medium">{useCase.title}</h3>
                <p className="text-muted-foreground mt-2 leading-7">
                  {useCase.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div>
            <div className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
              <FileSpreadsheet aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-5 text-3xl font-medium tracking-[-0.025em] text-balance sm:text-4xl">
              {fileTitle}
            </h2>
            <p className="text-muted-foreground mt-4 leading-7">
              {fileDescription}
            </p>
            <dl className="mt-7 space-y-5">
              {facts.map((fact) => (
                <div key={fact.title}>
                  <dt className="font-medium">{fact.title}</dt>
                  <dd className="text-muted-foreground mt-1 leading-7">
                    {fact.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="border-border bg-card overflow-hidden rounded-2xl border">
            <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <h3 className="font-medium">{previewTitle}</h3>
              <span className="text-muted-foreground text-xs">
                {sampleMeta}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    {previewHeaders.map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className="border-border border-b px-4 py-3 font-medium"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {previewRow.map((cell, index) => (
                      <td
                        key={`${cell}-${index}`}
                        className="border-border text-muted-foreground border-b px-4 py-4 align-top"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="px-5 py-5">
              <a
                href={sampleHref}
                download
                className={buttonVariants({ variant: 'outline' })}
              >
                <Download aria-hidden="true" />
                {sampleLabel}
              </a>
            </div>
          </div>
        </div>
      </section>

      {fieldReference}

      <section className="border-border bg-muted/25 border-y px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-medium tracking-[-0.025em] text-balance sm:text-4xl">
              {compatibilityTitle}
            </h2>
            <p className="text-muted-foreground mt-4 leading-7">
              {compatibilityDescription}
            </p>
          </div>

          <div className="border-border bg-card mt-9 overflow-hidden rounded-2xl border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    {compatibilityHeaders.map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className="border-border border-b px-5 py-3.5 font-medium"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compatibilityRows.map((row) => (
                    <tr key={row.app}>
                      <th
                        scope="row"
                        className="border-border border-b px-5 py-4 font-medium"
                      >
                        {row.app}
                      </th>
                      <td className="border-border text-muted-foreground border-b px-5 py-4 leading-6">
                        {row.behavior}
                      </td>
                      <td className="border-border text-muted-foreground border-b px-5 py-4 leading-6">
                        {row.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-border bg-card mt-8 rounded-2xl border p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Info aria-hidden="true" className="text-primary size-5" />
              <h3 className="text-lg font-medium">{limitationsTitle}</h3>
            </div>
            <ul className="text-muted-foreground mt-5 grid gap-3 leading-7 md:grid-cols-3">
              {limitations.map((limitation) => (
                <li key={limitation} className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="bg-primary mt-2.5 size-1.5 shrink-0 rounded-full"
                  />
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
            <Link
              href={alternativeHref}
              className="text-primary mt-7 inline-flex items-center gap-2 text-sm font-medium hover:underline"
            >
              {alternativeLabel}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
