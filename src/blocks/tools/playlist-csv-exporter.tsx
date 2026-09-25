import { Check } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { Hero } from '@/blocks/hero';
import { ExportFieldReference } from '@/blocks/tools/export-field-reference';
import { ExportFormatDetails } from '@/components/tools/export-format-details';

export function PlaylistCsvExporter() {
  const steps = [
    {
      title: m['tools.csv.step_1.title'](),
      description: m['tools.csv.step_1.description'](),
    },
    {
      title: m['tools.csv.step_2.title'](),
      description: m['tools.csv.step_2.description'](),
    },
    {
      title: m['tools.csv.step_3.title'](),
      description: m['tools.csv.step_3.description'](),
    },
  ];
  const benefits = [
    {
      title: m['tools.csv.benefit_1.title'](),
      description: m['tools.csv.benefit_1.description'](),
    },
    {
      title: m['tools.csv.benefit_2.title'](),
      description: m['tools.csv.benefit_2.description'](),
    },
    {
      title: m['tools.csv.benefit_3.title'](),
      description: m['tools.csv.benefit_3.description'](),
    },
  ];

  return (
    <>
      <Hero
        initialFormats={['csv']}
        primaryFormatKey="csv"
        variant="tool"
        breadcrumbLabel={m['tools.common.breadcrumb_label']()}
        breadcrumbs={[
          { label: m['tools.common.breadcrumb_home'](), href: '/' },
          { label: m['tools.common.breadcrumb_tools'](), href: '/tools' },
          { label: m['tools.csv.title']() },
        ]}
        copy={{
          eyebrow: m['tools.csv.eyebrow'](),
          headline: m['tools.csv.title'](),
          subheadline: m['tools.csv.description'](),
          exporterTitle: m['tools.csv.exporter_title'](),
          exporterDescription: m['tools.csv.exporter_description'](),
          defaultFormats: m['tools.csv.default_formats'](),
          primaryFormat: m['tools.csv.primary_format'](),
          primaryFormatDescription: m['tools.csv.primary_format_description'](),
          included: m['tools.csv.included'](),
          additionalFormats: m['tools.csv.additional_formats'](),
          additionalFormatsDescription:
            m['tools.csv.additional_formats_description'](),
          exportLabel: m['tools.csv.export_button'](),
        }}
      />

      <section className="border-border bg-muted/25 border-y px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-medium tracking-[-0.025em] text-balance sm:text-4xl">
            {m['tools.csv.how_title']()}
          </h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
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
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-2xl text-3xl font-medium tracking-[-0.025em] text-balance sm:text-4xl">
            {m['tools.csv.benefits_title']()}
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {benefits.map((benefit) => (
              <article
                key={benefit.title}
                className="border-border bg-card rounded-xl border p-6 sm:p-7"
              >
                <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                  <Check aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-medium">{benefit.title}</h3>
                <p className="text-muted-foreground mt-2 leading-7">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ExportFormatDetails
        fieldReference={<ExportFieldReference />}
        heading={m['tools.csv.details_title']()}
        description={m['tools.csv.details_description']()}
        useCases={[
          {
            title: m['tools.csv.use_case_1.title'](),
            description: m['tools.csv.use_case_1.description'](),
          },
          {
            title: m['tools.csv.use_case_2.title'](),
            description: m['tools.csv.use_case_2.description'](),
          },
          {
            title: m['tools.csv.use_case_3.title'](),
            description: m['tools.csv.use_case_3.description'](),
          },
        ]}
        fileTitle={m['tools.csv.file_title']()}
        fileDescription={m['tools.csv.file_description']()}
        facts={[
          {
            title: m['tools.csv.fact_1.title'](),
            description: m['tools.csv.fact_1.description'](),
          },
          {
            title: m['tools.csv.fact_2.title'](),
            description: m['tools.csv.fact_2.description'](),
          },
          {
            title: m['tools.csv.fact_3.title'](),
            description: m['tools.csv.fact_3.description'](),
          },
          {
            title: m['tools.csv.fact_4.title'](),
            description: m['tools.csv.fact_4.description'](),
          },
        ]}
        previewTitle={m['tools.csv.preview_title']()}
        previewHeaders={[
          m['tools.csv.preview_header_1'](),
          m['tools.csv.preview_header_2'](),
          m['tools.csv.preview_header_3'](),
          m['tools.csv.preview_header_4'](),
        ]}
        previewRow={[
          m['tools.csv.preview_row_1'](),
          m['tools.csv.preview_row_2'](),
          m['tools.csv.preview_row_3'](),
          m['tools.csv.preview_row_4'](),
        ]}
        sampleHref="/samples/youtube-playlist-export-sample.csv"
        sampleLabel={m['tools.csv.sample_label']()}
        sampleMeta={m['tools.csv.sample_meta']()}
        compatibilityTitle={m['tools.csv.compatibility_title']()}
        compatibilityDescription={m['tools.csv.compatibility_description']()}
        compatibilityHeaders={[
          m['tools.csv.compatibility_header_1'](),
          m['tools.csv.compatibility_header_2'](),
          m['tools.csv.compatibility_header_3'](),
        ]}
        compatibilityRows={[
          {
            app: m['tools.csv.compatibility_1.app'](),
            behavior: m['tools.csv.compatibility_1.behavior'](),
            note: m['tools.csv.compatibility_1.note'](),
          },
          {
            app: m['tools.csv.compatibility_2.app'](),
            behavior: m['tools.csv.compatibility_2.behavior'](),
            note: m['tools.csv.compatibility_2.note'](),
          },
          {
            app: m['tools.csv.compatibility_3.app'](),
            behavior: m['tools.csv.compatibility_3.behavior'](),
            note: m['tools.csv.compatibility_3.note'](),
          },
          {
            app: m['tools.csv.compatibility_4.app'](),
            behavior: m['tools.csv.compatibility_4.behavior'](),
            note: m['tools.csv.compatibility_4.note'](),
          },
        ]}
        limitationsTitle={m['tools.csv.limitations_title']()}
        limitations={[
          m['tools.csv.limitation_1'](),
          m['tools.csv.limitation_2'](),
          m['tools.csv.limitation_3'](),
        ]}
        alternativeHref="/tools/export-youtube-playlist-to-excel"
        alternativeLabel={m['tools.csv.alternative_label']()}
      />
    </>
  );
}
