import { Link } from '@/core/i18n/navigation';
import {
  FREE_PLAYLIST_EXPORT_LIMIT,
  SUBSCRIBER_PLAYLIST_EXPORT_LIMIT,
} from '@/config/playlist-export';
import { m } from '@/paraglide/messages.js';
import { CTA } from '@/blocks/cta';
import { FAQ } from '@/blocks/faq';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { Hero } from '@/blocks/hero';
import { HowItWorks } from '@/blocks/how-it-works';

const toolMessages = {
  csv: {
    additional_formats: m['tools.csv.additional_formats'],
    additional_formats_description:
      m['tools.csv.additional_formats_description'],
    alternative_label: m['tools.csv.alternative_label'],
    default_formats: m['tools.csv.default_formats'],
    description: m['tools.csv.description'],
    details_title: m['tools.csv.details_title'],
    export_button: m['tools.csv.export_button'],
    exporter_description: m['tools.csv.exporter_description'],
    exporter_title: m['tools.csv.exporter_title'],
    eyebrow: m['tools.csv.eyebrow'],
    how_title: m['tools.csv.how_title'],
    included: m['tools.csv.included'],
    primary_format: m['tools.csv.primary_format'],
    primary_format_description: m['tools.csv.primary_format_description'],
    title: m['tools.csv.title'],
    steps: [
      {
        title: m['tools.csv.step_1.title'],
        description: m['tools.csv.step_1.description'],
      },
      {
        title: m['tools.csv.step_2.title'],
        description: m['tools.csv.step_2.description'],
      },
      {
        title: m['tools.csv.step_3.title'],
        description: m['tools.csv.step_3.description'],
      },
    ],
    useCases: [
      {
        title: m['tools.csv.use_case_1.title'],
        description: m['tools.csv.use_case_1.description'],
      },
      {
        title: m['tools.csv.use_case_2.title'],
        description: m['tools.csv.use_case_2.description'],
      },
      {
        title: m['tools.csv.use_case_3.title'],
        description: m['tools.csv.use_case_3.description'],
      },
    ],
  },
  excel: {
    additional_formats: m['tools.excel.additional_formats'],
    additional_formats_description:
      m['tools.excel.additional_formats_description'],
    alternative_label: m['tools.excel.alternative_label'],
    default_formats: m['tools.excel.default_formats'],
    description: m['tools.excel.description'],
    details_title: m['tools.excel.details_title'],
    export_button: m['tools.excel.export_button'],
    exporter_description: m['tools.excel.exporter_description'],
    exporter_title: m['tools.excel.exporter_title'],
    eyebrow: m['tools.excel.eyebrow'],
    how_title: m['tools.excel.how_title'],
    included: m['tools.excel.included'],
    primary_format: m['tools.excel.primary_format'],
    primary_format_description: m['tools.excel.primary_format_description'],
    title: m['tools.excel.title'],
    steps: [
      {
        title: m['tools.excel.step_1.title'],
        description: m['tools.excel.step_1.description'],
      },
      {
        title: m['tools.excel.step_2.title'],
        description: m['tools.excel.step_2.description'],
      },
      {
        title: m['tools.excel.step_3.title'],
        description: m['tools.excel.step_3.description'],
      },
    ],
    useCases: [
      {
        title: m['tools.excel.use_case_1.title'],
        description: m['tools.excel.use_case_1.description'],
      },
      {
        title: m['tools.excel.use_case_2.title'],
        description: m['tools.excel.use_case_2.description'],
      },
      {
        title: m['tools.excel.use_case_3.title'],
        description: m['tools.excel.use_case_3.description'],
      },
    ],
  },
} as const;

type PageKind = 'home' | 'csv' | 'excel';
const csvPath = '/tools/export-youtube-playlist-to-csv';
const excelPath = '/tools/export-youtube-playlist-to-excel';
const sectionClass = 'mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20';
const titleClass =
  'text-3xl font-medium tracking-tight text-balance sm:text-4xl';
const linkClass =
  'text-primary underline underline-offset-4 hover:no-underline';

/** Three deliberately scoped German landing pages, sharing the actual exporter. */
export function GermanExportPage({ kind }: { kind: PageKind }) {
  const tool = kind === 'home' ? null : kind;
  const content = tool ? toolMessages[tool] : null;
  const formatKey = kind === 'csv' ? 'csv' : 'xlsx';
  const fieldGroups = [
    [
      m['localizedHome.fields.identity'](),
      m['localizedHome.fields.identity_detail'](),
    ],
    [
      m['localizedHome.fields.metrics'](),
      m['localizedHome.fields.metrics_detail'](),
    ],
    [
      m['localizedHome.fields.context'](),
      m['localizedHome.fields.context_detail'](),
    ],
  ];
  return (
    <div className="marketing-shell bg-background text-foreground min-h-screen">
      <Header />
      <main>
        {tool ? (
          <Hero
            key={tool}
            variant="tool"
            initialFormats={[formatKey]}
            primaryFormatKey={formatKey}
            breadcrumbLabel={m['tools.common.breadcrumb_label']()}
            breadcrumbs={[
              { label: m['tools.common.breadcrumb_home'](), href: '/' },
              { label: content!.title() },
            ]}
            copy={{
              eyebrow: content!.eyebrow(),
              headline: content!.title(),
              subheadline: content!.description(),
              exporterTitle: content!.exporter_title(),
              exporterDescription: content!.exporter_description(),
              defaultFormats: content!.default_formats(),
              primaryFormat: content!.primary_format(),
              primaryFormatDescription: content!.primary_format_description(),
              included: content!.included(),
              additionalFormats: content!.additional_formats(),
              additionalFormatsDescription:
                content!.additional_formats_description(),
              exportLabel: content!.export_button(),
            }}
          />
        ) : (
          <Hero />
        )}

        {tool ? (
          <section id="how-it-works" className={sectionClass}>
            <h2 className={titleClass}>{content!.how_title()}</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {([1, 2, 3] as const).map((step) => (
                <li key={step} className="border-border rounded-xl border p-6">
                  <span
                    className="text-primary text-2xl font-semibold"
                    aria-hidden="true"
                  >
                    0{step}
                  </span>
                  <h3 className="mt-4 text-xl font-medium">
                    {content!.steps[step - 1].title()}
                  </h3>
                  <p className="text-muted-foreground mt-3 leading-7">
                    {content!.steps[step - 1].description()}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <HowItWorks />
        )}

        <section id="formats" className="border-border bg-muted/25 border-y">
          <div className={sectionClass}>
            <h2 className={titleClass}>
              {tool
                ? content!.details_title()
                : m['localizedHome.formats.title']()}
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {(tool
                ? ([1, 2, 3] as const).map((i) => [
                    content!.useCases[i - 1].title(),
                    content!.useCases[i - 1].description(),
                  ])
                : [
                    [
                      m['localizedHome.formats.csv_title'](),
                      m['localizedHome.formats.csv_body'](),
                    ],
                    [
                      m['localizedHome.formats.xlsx_title'](),
                      m['localizedHome.formats.xlsx_body'](),
                    ],
                    [
                      m['localizedHome.formats.json_title'](),
                      m['localizedHome.formats.json_body'](),
                    ],
                  ]
              ).map(([title, body]) => (
                <article
                  key={title}
                  className="bg-card border-border rounded-xl border p-6"
                >
                  <h3 className="text-xl font-medium">{title}</h3>
                  <p className="text-muted-foreground mt-3 leading-7">{body}</p>
                </article>
              ))}
            </div>
            {tool && (
              <Link
                className={`${linkClass} mt-8 inline-block`}
                href={tool === 'csv' ? excelPath : csvPath}
              >
                {content!.alternative_label()}
              </Link>
            )}
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>{m['localizedHome.fields.title']()}</h2>
          <p className="text-muted-foreground mt-5 max-w-3xl leading-7">
            {m['localizedHome.fields.intro']()}
          </p>
          <div className="border-border mt-8 overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="p-4 font-medium">
                    {m['localizedHome.fields.group']()}
                  </th>
                  <th scope="col" className="p-4 font-medium">
                    {m['localizedHome.fields.examples']()}
                  </th>
                </tr>
              </thead>
              <tbody>
                {fieldGroups.map(([title, body]) => (
                  <tr key={title} className="border-border border-t">
                    <th scope="row" className="p-4 align-top font-medium">
                      {title}
                    </th>
                    <td className="text-muted-foreground p-4 leading-6">
                      {body}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mt-5 max-w-3xl text-sm leading-6">
            {m['localizedHome.sample.note']()}
          </p>
          <div className="mt-4 flex flex-wrap gap-5">
            {kind !== 'excel' && (
              <a
                href="/samples/youtube-playlist-export-sample.csv"
                download
                className={linkClass}
              >
                {m['localizedHome.sample.csv']()}
              </a>
            )}
            {kind !== 'csv' && (
              <a
                href="/samples/youtube-playlist-export-sample.xlsx"
                download
                className={linkClass}
              >
                {m['localizedHome.sample.xlsx']()}
              </a>
            )}
          </div>
          {kind === 'home' && (
            <div className="mt-12 max-w-3xl">
              <h2 className="text-2xl font-medium">
                {m['localizedHome.usecases.title']()}
              </h2>
              <p className="text-muted-foreground mt-4 leading-7">
                {m['localizedHome.usecases.body']()}
              </p>
            </div>
          )}
        </section>

        <section className="bg-muted/25">
          <div className={sectionClass}>
            <h2 className={titleClass}>{m['localizedHome.limits.title']()}</h2>
            <p className="text-muted-foreground mt-5 max-w-3xl leading-7">
              {m['localizedHome.limits.body']({
                free: FREE_PLAYLIST_EXPORT_LIMIT.toLocaleString('de-DE'),
                paid: SUBSCRIBER_PLAYLIST_EXPORT_LIMIT.toLocaleString('de-DE'),
              })}
            </p>
            <Link className={`${linkClass} mt-5 inline-block`} href="/pricing">
              {m['localizedHome.pricing']()}
            </Link>
          </div>
        </section>
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
