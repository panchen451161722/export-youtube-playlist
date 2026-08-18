import { Check } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { Hero } from '@/blocks/hero';

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
    </>
  );
}
