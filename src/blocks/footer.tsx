import { FileSpreadsheet, Youtube } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';

const productLinks = [
  { label: () => m['landing.footer.tool'](), href: '/#exporter' },
  { label: () => m['landing.nav.tools'](), href: '/tools' },
  { label: () => m['landing.footer.features'](), href: '/#features' },
  { label: () => m['landing.footer.how'](), href: '/#how-it-works' },
  { label: () => m['landing.footer.pricing'](), href: '/pricing' },
  { label: () => m['landing.footer.faq'](), href: '/#faq' },
  {
    label: () => m['landing.footer.blog'](),
    href: `${envConfigs.app_url}/blog`,
  },
] as const;

const legalLinks = [
  { label: () => m['landing.nav.about'](), href: '/about' },
  { label: () => m['landing.nav.contact'](), href: '/contact' },
  { label: () => m['landing.footer.privacy'](), href: '/privacy-policy' },
  { label: () => m['landing.footer.terms'](), href: '/terms-of-service' },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border bg-background text-foreground border-t">
      <div className="mx-auto max-w-[1280px] px-6 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_0.8fr_0.8fr]">
          <div>
            <Link
              href="/#exporter"
              className="focus-visible:ring-ring inline-flex min-h-11 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-offset-2"
            >
              <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
                <FileSpreadsheet aria-hidden="true" className="size-5" />
              </span>
              <span className="font-semibold tracking-tight">
                {envConfigs.app_name}
              </span>
            </Link>
            <p className="text-muted-foreground mt-5 max-w-sm text-sm leading-6">
              {m['landing.footer.tagline']()}
            </p>
            <div className="border-border bg-card text-muted-foreground mt-6 flex items-start gap-3 rounded-xl border p-4 text-xs leading-5">
              <Youtube
                aria-hidden="true"
                className="text-muted-foreground mt-0.5 size-4 shrink-0"
              />
              <p>{m['landing.footer.non_affiliation']()}</p>
            </div>
          </div>

          <nav aria-label={m['landing.footer.product_label']()}>
            <p className="text-sm font-medium">
              {m['landing.footer.product']()}
            </p>
            <ul className="mt-5 space-y-3">
              {productLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center text-sm transition-colors focus-visible:rounded focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {label()}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={m['landing.footer.legal_label']()}>
            <p className="text-sm font-medium">{m['landing.footer.legal']()}</p>
            <ul className="mt-5 space-y-3">
              {legalLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center text-sm transition-colors focus-visible:rounded focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {label()}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-border text-muted-foreground mt-12 border-t pt-6 text-sm">
          {m['landing.footer.copyright']({
            year: String(year),
            app: envConfigs.app_name,
          })}
        </div>
      </div>
    </footer>
  );
}
