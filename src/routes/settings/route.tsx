import { createFileRoute, Outlet } from '@tanstack/react-router';
import { CreditCard, Home, ListVideo, Receipt, User } from 'lucide-react';

import { envConfigs } from '@/config';
import { privatePageSeo } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { AppLayout } from '@/components/app-layout';

export const Route = createFileRoute('/settings')({
  head: () => privatePageSeo(m['common.systems.settings']()),
  component: SettingsLayout,
});

function SettingsLayout() {
  const group = m['common.systems.settings']();
  const navItems = [
    {
      href: '/settings/collections',
      label: m['guardPricing.nav_collections'](),
      icon: ListVideo,
      group,
    },
    {
      href: '/settings/billing',
      label: m['settings.nav.billing'](),
      icon: CreditCard,
      group,
    },
    {
      href: '/settings/payments',
      label: m['settings.nav.payments'](),
      icon: Receipt,
      group,
    },
    {
      href: '/settings/profile',
      label: m['settings.nav.profile'](),
      icon: User,
      group,
    },
  ];
  const footerNavItems = [
    { href: '/', label: m['common.systems.home'](), icon: Home, newTab: true },
  ];
  return (
    <AppLayout
      navItems={navItems}
      footerNavItems={footerNavItems}
      brand={envConfigs.app_name}
      brandHref="/settings/collections"
      profileHref="/settings/profile"
    >
      <Outlet />
    </AppLayout>
  );
}
