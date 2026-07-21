import { FileSpreadsheet, Youtube } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';

const productLinks = [
  { label: () => m['landing.footer.tool'](), href: '#exporter' },
  { label: () => m['landing.footer.features'](), href: '#features' },
  { label: () => m['landing.footer.how'](), href: '#how-it-works' },
  { label: () => m['landing.footer.pricing'](), href: '#pricing' },
  { label: () => m['landing.footer.faq'](), href: '#faq' },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_0.8fr_0.8fr]">
          <div>
            <a
              href="#exporter"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <FileSpreadsheet aria-hidden="true" className="size-5" />
              </span>
              <span className="font-semibold tracking-tight">
                {envConfigs.app_name}
              </span>
            </a>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
              {m['landing.footer.tagline']()}
            </p>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-xs leading-5 text-slate-400">
              <Youtube
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-slate-500"
              />
              <p>{m['landing.footer.non_affiliation']()}</p>
            </div>
          </div>

          <nav aria-label={m['landing.footer.product_label']()}>
            <p className="text-sm font-semibold text-white">
              {m['landing.footer.product']()}
            </p>
            <ul className="mt-5 space-y-3">
              {productLinks.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="inline-flex min-h-11 items-center text-sm text-slate-400 transition-colors hover:text-white focus-visible:rounded focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:outline-none"
                  >
                    {label()}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={m['landing.footer.legal_label']()}>
            <p className="text-sm font-semibold text-white">
              {m['landing.footer.legal']()}
            </p>
            <ul className="mt-5 space-y-3">
              <li>
                <Link
                  href="/privacy-policy"
                  className="inline-flex min-h-11 items-center text-sm text-slate-400 transition-colors hover:text-white focus-visible:rounded focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:outline-none"
                >
                  {m['landing.footer.privacy']()}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-service"
                  className="inline-flex min-h-11 items-center text-sm text-slate-400 transition-colors hover:text-white focus-visible:rounded focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:outline-none"
                >
                  {m['landing.footer.terms']()}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-6 text-sm text-slate-500">
          {m['landing.footer.copyright']({
            year: String(year),
            app: envConfigs.app_name,
          })}
        </div>
      </div>
    </footer>
  );
}
