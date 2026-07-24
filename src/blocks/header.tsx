import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { LocaleSelector } from '@/components/locale-selector';
import { SiteUserMenu } from '@/components/site-user-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { PUBLIC_TOOL_DEFINITIONS } from '@/components/tools/public-tool-definitions';

type ToolItem = {
  label: string;
  href: string;
};

function ToolsMenu({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const toolItems: ToolItem[] = [
    {
      label: m['tools.catalog.export.title'](),
      href: '/#exporter',
    },
    {
      label: m['tools.catalog.links.title'](),
      href: '/tools/youtube-playlist-link-extractor',
    },
    {
      label: m['tools.catalog.titles.title'](),
      href: '/tools/youtube-playlist-title-extractor',
    },
    {
      label: m['tools.catalog.analyzer.title'](),
      href: '/tools/youtube-playlist-analyzer',
    },
    ...PUBLIC_TOOL_DEFINITIONS.map((tool) => ({
      label: tDynamic(`tools.extra.${tool.key}.title`),
      href: `/tools/${tool.slug}`,
    })),
  ];

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      const details = detailsRef.current;
      if (
        details?.open &&
        event.target instanceof Node &&
        !details.contains(event.target)
      ) {
        details.open = false;
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && detailsRef.current?.open) {
        detailsRef.current.open = false;
        detailsRef.current.querySelector('summary')?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const closeMenu = () => {
    if (detailsRef.current) detailsRef.current.open = false;
    onNavigate?.();
  };

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className={
          mobile
            ? 'flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-[#35425b] hover:bg-white dark:text-slate-200 dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden'
            : 'flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-[#667085] transition-colors hover:text-[#18213b] dark:text-slate-300 dark:hover:text-white [&::-webkit-details-marker]:hidden'
        }
      >
        {m['landing.nav.tools']()}
        <span className="rounded-full bg-[#ff4d3d]/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#e33d31] uppercase dark:bg-[#ff4d3d]/15 dark:text-[#ff7b70]">
          {m['landing.nav.new']()}
        </span>
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
      </summary>

      <div
        className={
          mobile
            ? 'mt-1 grid max-h-[45vh] gap-1 overflow-y-auto rounded-xl border border-[#18213b]/8 bg-white/60 p-2 dark:border-white/10 dark:bg-white/5'
            : 'absolute top-[calc(100%+1.25rem)] left-1/2 z-50 grid max-h-[calc(100vh-6rem)] w-[min(52rem,calc(100vw-2rem))] -translate-x-1/2 grid-cols-2 gap-1 overflow-y-auto rounded-2xl border border-[#18213b]/10 bg-[#fffdf8] p-3 shadow-[0_24px_70px_rgba(24,33,59,.18)] xl:grid-cols-3 dark:border-white/10 dark:bg-[#182237]'
        }
      >
        <Link
          href="/tools"
          onClick={closeMenu}
          className="col-span-full mb-1 flex items-center justify-between rounded-xl bg-[#18213b] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#273351] dark:bg-white dark:text-[#18213b] dark:hover:bg-slate-100"
        >
          <span>{m['tools.catalog.title']()}</span>
          <span aria-hidden="true">→</span>
        </Link>
        {toolItems.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            onClick={closeMenu}
            className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#35425b] transition-colors hover:bg-[#5865f2]/10 dark:text-white dark:hover:bg-white/10"
          >
            <span>{tool.label}</span>
          </Link>
        ))}
      </div>
    </details>
  );
}

export function Header() {
  const { data: session } = useSession();
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setHydrated(true), []);

  const navItems = [
    { href: '/#exporter', label: m['landing.nav.home'](), disabled: false },
    { href: '/blog', label: m['landing.nav.blogs'](), disabled: false },
    { href: '/pricing', label: m['landing.nav.pricing'](), disabled: false },
    { href: '#', label: m['landing.nav.feedback'](), disabled: true },
    { href: '/contact', label: m['landing.nav.contact'](), disabled: false },
    { href: '/about', label: m['landing.nav.about'](), disabled: false },
  ];

  const renderNavItem = (item: (typeof navItems)[number], mobile = false) => {
    const className = mobile
      ? 'rounded-xl px-3 py-3 text-sm font-semibold text-[#35425b] hover:bg-white dark:text-slate-200 dark:hover:bg-white/5'
      : 'text-sm font-medium text-[#667085] transition-colors hover:text-[#18213b] dark:text-slate-300 dark:hover:text-white';

    if (item.disabled) {
      return (
        <span
          key={item.label}
          aria-disabled="true"
          title={m['landing.nav.coming_soon']()}
          className={`${className} cursor-default`}
        >
          {item.label}
        </span>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={mobile ? () => setOpen(false) : undefined}
        className={className}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#18213b]/8 bg-[#f7f5ef]/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#111827]/90">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/#exporter" className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#18213b] text-base font-black text-white shadow-sm dark:bg-white dark:text-[#18213b]">
            E
          </span>
          <span className="truncate text-sm font-bold tracking-[-0.01em] text-[#18213b] sm:text-base dark:text-white">
            {envConfigs.app_name}
          </span>
        </Link>

        <nav
          className="hidden items-center gap-4 lg:flex"
          aria-label={m['landing.nav.primary']()}
        >
          {renderNavItem(navItems[0])}
          <ToolsMenu />
          {navItems.slice(1).map((item) => renderNavItem(item))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LocaleSelector />
          <ThemeToggle />
          {hydrated && session?.user ? (
            <SiteUserMenu
              name={session.user.name || 'User'}
              email={session.user.email}
              image={session.user.image}
            />
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex h-10 items-center rounded-xl border border-[#18213b]/10 bg-white/70 px-4 text-sm font-semibold text-[#35425b] transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              {m['common.sign.sign_in_title']()}
            </Link>
          )}
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-xl border border-[#18213b]/10 bg-white/70 lg:hidden dark:border-white/10 dark:bg-white/5"
          aria-label={open ? m['landing.nav.close']() : m['landing.nav.open']()}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[#18213b]/8 bg-[#f7f5ef] px-4 py-4 lg:hidden dark:border-white/10 dark:bg-[#111827]">
          <nav
            className="mx-auto grid max-w-6xl gap-1"
            aria-label={m['landing.nav.mobile']()}
          >
            {renderNavItem(navItems[0], true)}
            <ToolsMenu mobile onNavigate={() => setOpen(false)} />
            {navItems.slice(1).map((item) => renderNavItem(item, true))}
            <div className="mt-2 flex items-center gap-2 border-t border-[#18213b]/8 pt-3 dark:border-white/10">
              <LocaleSelector />
              <ThemeToggle />
              {hydrated && session?.user ? (
                <SiteUserMenu
                  name={session.user.name || 'User'}
                  email={session.user.email}
                  image={session.user.image}
                />
              ) : (
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 items-center rounded-xl border border-[#18213b]/10 bg-white/70 px-4 text-sm font-semibold text-[#35425b] dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  {m['common.sign.sign_in_title']()}
                </Link>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
