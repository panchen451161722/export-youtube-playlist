'use client';

import { useState } from 'react';
import { FileSpreadsheet, Menu, X } from 'lucide-react';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { LocaleSelector } from '@/components/locale-selector';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
  ['#features', 'landing.nav.features'],
  ['#how-it-works', 'landing.nav.how'],
  ['#pricing', 'landing.nav.pricing'],
  ['#faq', 'landing.nav.faq'],
] as const;

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#18213b]/8 bg-[#f7f5ef]/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#111827]/90">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#exporter" className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#18213b] text-white shadow-sm dark:bg-white dark:text-[#18213b]">
            <FileSpreadsheet className="size-[1.15rem]" />
          </span>
          <span className="truncate text-sm font-bold tracking-[-0.01em] text-[#18213b] sm:text-base dark:text-white">
            {envConfigs.app_name}
          </span>
        </a>

        <nav
          className="hidden items-center gap-7 md:flex"
          aria-label={m['landing.nav.primary']()}
        >
          {navItems.map(([href, key]) => (
            <a
              key={href}
              href={href}
              className="text-sm font-medium text-[#667085] transition-colors hover:text-[#18213b] dark:text-slate-300 dark:hover:text-white"
            >
              {m[key]()}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LocaleSelector />
          <ThemeToggle />
          <a
            href="#exporter"
            className="ml-1 inline-flex h-10 items-center rounded-xl bg-[#ff4d3d] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,77,61,.22)] transition-colors hover:bg-[#ec3d30]"
          >
            {m['landing.nav.export']()}
          </a>
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-xl border border-[#18213b]/10 bg-white/70 md:hidden dark:border-white/10 dark:bg-white/5"
          aria-label={open ? m['landing.nav.close']() : m['landing.nav.open']()}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[#18213b]/8 bg-[#f7f5ef] px-4 py-4 md:hidden dark:border-white/10 dark:bg-[#111827]">
          <nav
            className="mx-auto grid max-w-6xl gap-1"
            aria-label={m['landing.nav.mobile']()}
          >
            {navItems.map(([href, key]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-[#35425b] hover:bg-white dark:text-slate-200 dark:hover:bg-white/5"
              >
                {m[key]()}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-2 border-t border-[#18213b]/8 pt-3 dark:border-white/10">
              <LocaleSelector />
              <ThemeToggle />
              <a
                href="#exporter"
                onClick={() => setOpen(false)}
                className="ml-auto inline-flex h-10 items-center rounded-xl bg-[#ff4d3d] px-4 text-sm font-semibold text-white"
              >
                {m['landing.nav.export']()}
              </a>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
