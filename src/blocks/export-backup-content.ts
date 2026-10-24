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
  };
}
