import { Check } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { Hero } from '@/blocks/hero';
import { ExportFormatDetails } from '@/components/tools/export-format-details';

export function PlaylistExcelExporter() {
  const steps = [
    {
      title: m['tools.excel.step_1.title'](),
      description: m['tools.excel.step_1.description'](),
    },
    {
      title: m['tools.excel.step_2.title'](),
      description: m['tools.excel.step_2.description'](),
    },
    {
      title: m['tools.excel.step_3.title'](),
      description: m['tools.excel.step_3.description'](),
    },
  ];
  const benefits = [
    {
      title: m['tools.excel.benefit_1.title'](),
      description: m['tools.excel.benefit_1.description'](),
    },
    {
      title: m['tools.excel.benefit_2.title'](),
      description: m['tools.excel.benefit_2.description'](),
    },
    {
      title: m['tools.excel.benefit_3.title'](),
      description: m['tools.excel.benefit_3.description'](),
    },
  ];

  return (
    <>
      <Hero
        initialFormats={['xlsx']}
        primaryFormatKey="xlsx"
        variant="tool"
        breadcrumbLabel={m['tools.common.breadcrumb_label']()}
        breadcrumbs={[
          { label: m['tools.common.breadcrumb_home'](), href: '/' },
          { label: m['tools.common.breadcrumb_tools'](), href: '/tools' },
          { label: m['tools.excel.title']() },
        ]}
        copy={{
          eyebrow: m['tools.excel.eyebrow'](),
          headline: m['tools.excel.title'](),
          subheadline: m['tools.excel.description'](),
          exporterTitle: m['tools.excel.exporter_title'](),
          exporterDescription: m['tools.excel.exporter_description'](),
          defaultFormats: m['tools.excel.default_formats'](),
          primaryFormat: m['tools.excel.primary_format'](),
          primaryFormatDescription:
            m['tools.excel.primary_format_description'](),
          included: m['tools.excel.included'](),
          additionalFormats: m['tools.excel.additional_formats'](),
          additionalFormatsDescription:
            m['tools.excel.additional_formats_description'](),
          exportLabel: m['tools.excel.export_button'](),
        }}
      />

      <section className="border-border bg-muted/25 border-y px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-medium tracking-[-0.025em] text-balance sm:text-4xl">
            {m['tools.excel.how_title']()}
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
            {m['tools.excel.benefits_title']()}
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
        heading={m['tools.excel.details_title']()}
        description={m['tools.excel.details_description']()}
        useCases={[
          {
            title: m['tools.excel.use_case_1.title'](),
            description: m['tools.excel.use_case_1.description'](),
          },
          {
            title: m['tools.excel.use_case_2.title'](),
            description: m['tools.excel.use_case_2.description'](),
          },
          {
            title: m['tools.excel.use_case_3.title'](),
            description: m['tools.excel.use_case_3.description'](),
          },
        ]}
        fileTitle={m['tools.excel.file_title']()}
        fileDescription={m['tools.excel.file_description']()}
        facts={[
          {
            title: m['tools.excel.fact_1.title'](),
            description: m['tools.excel.fact_1.description'](),
          },
          {
            title: m['tools.excel.fact_2.title'](),
            description: m['tools.excel.fact_2.description'](),
          },
          {
            title: m['tools.excel.fact_3.title'](),
            description: m['tools.excel.fact_3.description'](),
          },
          {
            title: m['tools.excel.fact_4.title'](),
            description: m['tools.excel.fact_4.description'](),
          },
        ]}
        previewTitle={m['tools.excel.preview_title']()}
        previewHeaders={[
          m['tools.excel.preview_header_1'](),
          m['tools.excel.preview_header_2'](),
          m['tools.excel.preview_header_3'](),
          m['tools.excel.preview_header_4'](),
        ]}
        previewRow={[
          m['tools.excel.preview_row_1'](),
          m['tools.excel.preview_row_2'](),
          m['tools.excel.preview_row_3'](),
          m['tools.excel.preview_row_4'](),
        ]}
        sampleHref="/samples/youtube-playlist-export-sample.xlsx"
        sampleLabel={m['tools.excel.sample_label']()}
        sampleMeta={m['tools.excel.sample_meta']()}
        compatibilityTitle={m['tools.excel.compatibility_title']()}
        compatibilityDescription={m['tools.excel.compatibility_description']()}
        compatibilityHeaders={[
          m['tools.excel.compatibility_header_1'](),
          m['tools.excel.compatibility_header_2'](),
          m['tools.excel.compatibility_header_3'](),
        ]}
        compatibilityRows={[
          {
            app: m['tools.excel.compatibility_1.app'](),
            behavior: m['tools.excel.compatibility_1.behavior'](),
            note: m['tools.excel.compatibility_1.note'](),
          },
          {
            app: m['tools.excel.compatibility_2.app'](),
            behavior: m['tools.excel.compatibility_2.behavior'](),
            note: m['tools.excel.compatibility_2.note'](),
          },
          {
            app: m['tools.excel.compatibility_3.app'](),
            behavior: m['tools.excel.compatibility_3.behavior'](),
            note: m['tools.excel.compatibility_3.note'](),
          },
          {
            app: m['tools.excel.compatibility_4.app'](),
            behavior: m['tools.excel.compatibility_4.behavior'](),
            note: m['tools.excel.compatibility_4.note'](),
          },
        ]}
        limitationsTitle={m['tools.excel.limitations_title']()}
        limitations={[
          m['tools.excel.limitation_1'](),
          m['tools.excel.limitation_2'](),
          m['tools.excel.limitation_3'](),
        ]}
        alternativeHref="/tools/export-youtube-playlist-to-csv"
        alternativeLabel={m['tools.excel.alternative_label']()}
      />
    </>
  );
}
