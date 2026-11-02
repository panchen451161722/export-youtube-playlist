import { GUARD_SNAPSHOT_LIMIT } from '@/config/guard-plans';
import { m } from '@/paraglide/messages.js';

/** Shared copy for pricing cards and the backup checkout dialog. */
export function guardPlanFeatures() {
  return [
    m['guardPricing.feature_playlist_exports'](),
    m['guardPricing.feature_snapshots']({ count: GUARD_SNAPSHOT_LIMIT }),
    m['guardPricing.feature_sources'](),
    m['guardPricing.feature_private_sources'](),
    m['guardPricing.feature_changes'](),
    m['guardPricing.feature_exports'](),
    m['guardPricing.feature_schedule'](),
  ];
}
