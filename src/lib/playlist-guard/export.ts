import type { GuardItem } from './types';

/** Prevent spreadsheet formula execution for all user/upstream supplied fields. */
export function guardExportCell(value: string | number): string {
  const text = String(value);
  return /^[\s]*[=+\-@\t\r\n]/.test(text) ? `'${text}` : text;
}
export function guardExportRows(items: GuardItem[]): (string | number)[][] {
  return [
    [
      'Position',
      'Title',
      'Channel',
      items.some((item) => item.kind === 'channel')
        ? 'Channel URL'
        : 'Video URL',
      'Duration',
      items.some((item) => item.kind === 'channel') ? 'Channel ID' : 'Video ID',
      'Missing since',
      'Views',
    ],
    ...items.map((v) => [
      v.position,
      v.title,
      v.channel,
      v.url,
      v.duration,
      v.id,
      'missingSince' in v && typeof v.missingSince === 'string'
        ? v.missingSince
        : '',
      v.views ?? '',
    ]),
  ];
}
export function guardCsv(items: GuardItem[]): string {
  const rows = guardExportRows(items);
  return (
    '\ufeff' +
    rows
      .map((row) =>
        row
          .map((v) => '"' + guardExportCell(v).replaceAll('"', '""') + '"')
          .join(',')
      )
      .join('\r\n')
  );
}
export async function downloadGuardExport(
  items: GuardItem[],
  name: string,
  format: 'csv' | 'json' | 'xlsx'
) {
  const safeName =
    name.replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 100) || 'playlist-backup';
  let blob: Blob;
  if (format === 'xlsx') {
    const { default: writeXlsxFile } = await import('write-excel-file/browser');
    const rows = guardExportRows(items).map((row) =>
      row.map((value) => ({ type: String, value: guardExportCell(value) }))
    );
    blob = await writeXlsxFile(rows, {
      columns: [
        { width: 12 },
        { width: 50 },
        { width: 30 },
        { width: 55 },
        { width: 14 },
        { width: 18 },
        { width: 26 },
        { width: 18 },
      ],
    }).toBlob();
  } else
    blob =
      format === 'json'
        ? new Blob([JSON.stringify(items, null, 2)], {
            type: 'application/json',
          })
        : new Blob([guardCsv(items)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.${format}`;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}
