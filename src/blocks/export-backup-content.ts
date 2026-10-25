import { GUARD_TRIAL_DAYS } from '@/config/guard-plans';
import { m } from '@/paraglide/messages.js';
import type { ExportBackupContent } from '@/components/export-backup-cta';

export function exportBackupContent(): ExportBackupContent {
  return {
    success: m['exportBackup.success'](),
    partial: (count) => m['exportBackup.partial']({ count }),
    trial: m['exportBackup.trial']({ days: GUARD_TRIAL_DAYS }),
    title: m['exportBackup.title'](),
    description: m['exportBackup.description'](),
    action: m['exportBackup.action'](),
    note: m['exportBackup.note'](),
    privatePlaylist: {
      status: m['exportBackup.private.status'](),
      badge: m['exportBackup.private.badge'](),
      title: m['exportBackup.private.title'](),
      description: m['exportBackup.private.description'](),
      action: m['exportBackup.private.action'](),
      connectedAction: m['exportBackup.private.connected_action'](),
      note: m['exportBackup.private.note'](),
    },
  };
}
