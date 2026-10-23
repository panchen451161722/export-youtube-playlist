import { m } from '@/paraglide/messages.js';
import type { ExportBackupContent } from '@/components/export-backup-cta';

export function exportBackupContent(): ExportBackupContent {
  return {
    success: m['exportBackup.success'](),
    title: m['exportBackup.title'](),
    description: m['exportBackup.description'](),
    action: m['exportBackup.action'](),
    note: m['exportBackup.note'](),
  };
}
