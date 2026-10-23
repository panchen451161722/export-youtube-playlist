import { CreditCard } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

export function BillingMenuItem() {
  return (
    <DropdownMenuItem render={<Link href="/settings/billing" />}>
      <CreditCard className="size-4" />
      {m['settings.nav.billing']()}
    </DropdownMenuItem>
  );
}
