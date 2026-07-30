import {
  exportCell,
  exportRows,
  recordObject,
  safeExportFileName,
  safeSpreadsheetCell,
} from './records';
import {
  YOUTUBE_EXPORT_COLUMNS,
  YOUTUBE_EXPORT_FORMATS,
  type GeneratedYouTubeExportFile,
  type YouTubeExportContext,
  type YouTubeExportFormat,
  type YouTubeExportRecord,
} from './types';

const encoder = new TextEncoder();

function textBytes(value: string, bom = false): Uint8Array {
  const bytes = encoder.encode(value);
  if (!bom) return bytes;
  const output = new Uint8Array(bytes.length + 3);
  output.set([0xef, 0xbb, 0xbf]);
  output.set(bytes, 3);
  return output;
}

function csvCell(value: string | number | null): string {
  const safeValue = safeSpreadsheetCell(value);
  const text = safeValue === null ? '' : String(safeValue);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(records: YouTubeExportRecord[]): Uint8Array {
  const rows = [
    YOUTUBE_EXPORT_COLUMNS.map((column) => column.label),
    ...exportRows(records),
  ];
  return textBytes(
    rows.map((row) => row.map(csvCell).join(',')).join('\r\n'),
    true
  );
}

async function xlsx(records: YouTubeExportRecord[]): Promise<Uint8Array> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const header = YOUTUBE_EXPORT_COLUMNS.map((column) => ({
    value: column.label,
    fontWeight: 'bold' as const,
    backgroundColor: '#E8EDF8',
  }));
  const rows = exportRows(records).map((row) =>
    row.map((value, columnIndex) => ({
      value: safeSpreadsheetCell(value) ?? undefined,
      alignVertical: 'top' as const,
      wrap: [2, 3, 4, 5, 6].includes(columnIndex),
      ...(columnIndex === 6 ? { height: 72 } : {}),
    }))
  );
  const blob = await writeXlsxFile([header, ...rows], {
    columns: [
      42, 42, 34, 30, 28, 36, 70, 45, 24, 14, 14, 14, 18, 18, 18, 20, 24,
    ].map((width) => ({ width })),
    stickyRowsCount: 1,
  }).toBlob();
  return new Uint8Array(await blob.arrayBuffer());
}

function plainText(records: YouTubeExportRecord[]): Uint8Array {
  const metadataColumns = YOUTUBE_EXPORT_COLUMNS.filter(
    (column) => column.key !== 'description'
  );
  const divider = '#'.repeat(63);
  const value = records
    .map((record) => {
      const lines = metadataColumns.map(
        (column) =>
          `${column.label}: ${String(exportCell(record, column.key) ?? '')}`
      );
      lines.push(`Description: ${record.description}`, divider, divider, '');
      return lines.join('\n');
    })
    .join('\n');
  return textBytes(value);
}

function bookmarkHtml(
  records: YouTubeExportRecord[],
  context: YouTubeExportContext
): Uint8Array {
  const links = records
    .map(
      (record) =>
        `        <DT><A HREF="${html(record.videoUrl)}">${html(record.title)}</A>`
    )
    .join('\n');
  return textBytes(`<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3>${html(context.title)}</H3>
    <DL><p>
${links}
    </DL><p>
</DL><p>`);
}

function json(records: YouTubeExportRecord[]): Uint8Array {
  return textBytes(
    JSON.stringify(
      records.map((record) => recordObject(record)),
      null,
      4
    )
  );
}

function markdownEscape(value: string, limited = false): string {
  return limited
    ? value.replace(/([`*_])/g, '\\$1')
    : value.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
}

function markdown(
  records: YouTubeExportRecord[],
  context: YouTubeExportContext
): Uint8Array {
  const metadataColumns = YOUTUBE_EXPORT_COLUMNS.filter(
    (column) => !['title', 'description'].includes(column.key)
  );
  const lines = [`# ${context.title}`, ''];
  records.forEach((record, index) => {
    lines.push(
      `## ${record.title || `Video ${index + 1}`}`,
      ...metadataColumns.map((column) => {
        const limited = [
          'videoUrl',
          'thumbnailUrl',
          'tags',
          'descriptionTags',
          'emails',
          'links',
        ].includes(column.key);
        return `- **${column.label}**: ${markdownEscape(
          String(exportCell(record, column.key) ?? ''),
          limited
        )}`;
      }),
      `- **Description**: ${markdownEscape(record.description).replace(
        /\r?\n/g,
        '\n    '
      )}`,
      '',
      '---',
      ''
    );
  });
  return textBytes(lines.join('\n'));
}

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function xmlTag(value: string): string {
  const tag = value.replace(/[^a-zA-Z0-9_]/g, '');
  if (!tag) return 'field';
  return /^\d/.test(tag) ? `_${tag}` : tag;
}

function xmlFormat(
  records: YouTubeExportRecord[],
  context: YouTubeExportContext
): Uint8Array {
  const videos = records
    .map((record) => {
      const fields = YOUTUBE_EXPORT_COLUMNS.map((column) => {
        const value = exportCell(record, column.key);
        const tag = xmlTag(column.label);
        return `            <${tag}>${xml(String(value ?? ''))}</${tag}>`;
      }).join('\n');
      return `        <item>\n${fields}\n        </item>`;
    })
    .join('\n');
  return textBytes(`<?xml version="1.0" encoding="UTF-8"?>
<export>
    <title>${xml(context.title)}</title>
    <items>
${videos}
    </items>
</export>`);
}

function html(value: string): string {
  return xml(value);
}

function htmlFormat(
  records: YouTubeExportRecord[],
  context: YouTubeExportContext
): Uint8Array {
  const head = YOUTUBE_EXPORT_COLUMNS.map(
    (column) => `<th>${html(column.label)}</th>`
  ).join('');
  const rows = records
    .map(
      (record) =>
        `<tr>${YOUTUBE_EXPORT_COLUMNS.map((column) => {
          const value = exportCell(record, column.key);
          return column.key === 'videoUrl'
            ? `<td><a href="${html(String(value ?? ''))}">${html(String(value ?? ''))}</a></td>`
            : `<td>${html(String(value ?? ''))}</td>`;
        }).join('')}</tr>`
    )
    .join('\n');
  return textBytes(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${html(context.title)}</title>
  <style>
    body{font-family:system-ui,sans-serif;margin:24px;color:#172033}
    .table-wrap{overflow:auto;border:1px solid #d9dee8;border-radius:10px}
    table{border-collapse:collapse;width:max-content;min-width:100%}
    th,td{border-bottom:1px solid #e5e8ef;padding:8px 10px;text-align:left;vertical-align:top;max-width:520px;white-space:pre-wrap}
    th{position:sticky;top:0;background:#e8edf8}
    tr:nth-child(even){background:#f8fafc}
    a{color:#3155d9}
  </style>
</head>
<body>
  <h1>${html(context.title)}</h1>
  <p>${records.length} videos</p>
  <div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>
</body>
</html>`);
}

function yamlScalar(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'number') return String(value);
  const string = String(value);
  if (string.includes('\n')) {
    return `|\n    ${string.replace(/\n/g, '\n    ')}`;
  }
  return string === '' ? '""' : JSON.stringify(string);
}

function yaml(
  records: YouTubeExportRecord[],
  context: YouTubeExportContext
): Uint8Array {
  const videos = records
    .map((record) =>
      YOUTUBE_EXPORT_COLUMNS.map((column, index) => {
        const prefix = index === 0 ? '- ' : '  ';
        return `${prefix}${column.label}: ${yamlScalar(
          exportCell(record, column.key)
        )}`;
      }).join('\n')
    )
    .join('\n\n');
  return textBytes(
    `# YouTube ${
      context.source === 'channel' ? 'Channel' : 'Playlist'
    } Export: ${context.title}\n${videos}\n`
  );
}

function m3u(records: YouTubeExportRecord[]): Uint8Array {
  return textBytes(
    [
      '#EXTM3U',
      ...records.flatMap((record) => [
        `#EXTINF:${record.durationSeconds ?? -1},${
          record.channelName
            ? `${record.channelName} - ${record.title}`
            : record.title
        }`,
        record.videoUrl,
      ]),
    ].join('\n')
  );
}

function definition(format: YouTubeExportFormat) {
  const item = YOUTUBE_EXPORT_FORMATS.find((entry) => entry.key === format);
  if (!item) throw new Error(`unsupported_export_format:${format}`);
  return item;
}

async function bytesForFormat(
  format: YouTubeExportFormat,
  records: YouTubeExportRecord[],
  context: YouTubeExportContext
): Promise<Uint8Array> {
  switch (format) {
    case 'csv':
      return csv(records);
    case 'xlsx':
      return xlsx(records);
    case 'text':
      return plainText(records);
    case 'bookmark':
      return bookmarkHtml(records, context);
    case 'json':
      return json(records);
    case 'markdown':
      return markdown(records, context);
    case 'xml':
      return xmlFormat(records, context);
    case 'html':
      return htmlFormat(records, context);
    case 'yaml':
      return yaml(records, context);
    case 'word': {
      const { createDocxBytes } = await import('./docx');
      return createDocxBytes(records, context);
    }
    case 'sqlite': {
      const { createSqliteBytes } = await import('./sqlite');
      return createSqliteBytes(records);
    }
    case 'm3u':
      return m3u(records);
    case 'm3u8':
      return m3u(records);
  }
}

export function resolveYouTubeExportFormats(
  selected: YouTubeExportFormat[]
): YouTubeExportFormat[] {
  return selected.length
    ? selected
    : YOUTUBE_EXPORT_FORMATS.map((format) => format.key);
}

export async function generateYouTubeExportFiles(params: {
  records: YouTubeExportRecord[];
  context: YouTubeExportContext;
  formats: YouTubeExportFormat[];
}): Promise<GeneratedYouTubeExportFile[]> {
  const formats = resolveYouTubeExportFormats(params.formats);
  const baseName = safeExportFileName(
    params.context.title,
    params.context.source === 'channel' ? 'youtube-channel' : 'youtube-playlist'
  );
  const files: GeneratedYouTubeExportFile[] = [];
  for (const format of formats) {
    const item = definition(format);
    try {
      files.push({
        format,
        fileName: `${baseName}${'fileSuffix' in item ? item.fileSuffix : ''}.${item.extension}`,
        mimeType: item.mimeType,
        bytes: await bytesForFormat(format, params.records, params.context),
      });
    } catch (error) {
      throw new Error(`export_generation_failed:${format}`, { cause: error });
    }
  }
  return files;
}
