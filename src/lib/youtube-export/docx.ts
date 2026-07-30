import { strToU8, zipSync } from 'fflate';

import { exportCell } from './records';
import {
  YOUTUBE_EXPORT_COLUMNS,
  type YouTubeExportContext,
  type YouTubeExportRecord,
} from './types';

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wordText(value: string): string {
  return value
    .split(/\r?\n/)
    .map(
      (line) =>
        `<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${xml(line)}</w:t></w:r>`
    )
    .join('<w:r><w:br/></w:r>');
}

function cell(value: string, header = false): string {
  return `<w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/>${
    header ? '<w:shd w:fill="E8EDF8"/>' : ''
  }</w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${
    header
      ? `<w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="0A66C2"/></w:rPr><w:t xml:space="preserve">${xml(
          value
        )}</w:t></w:r>`
      : wordText(value)
  }</w:p></w:tc>`;
}

function recordTable(record: YouTubeExportRecord): string {
  const rows = YOUTUBE_EXPORT_COLUMNS.filter(
    (column) => !['title', 'description'].includes(column.key)
  )
    .map(
      (column) =>
        `<w:tr>${cell(column.label, true)}${cell(
          String(exportCell(record, column.key) ?? '')
        )}</w:tr>`
    )
    .join('');
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr><w:tblGrid><w:gridCol w:w="2200"/><w:gridCol w:w="7800"/></w:tblGrid>${rows}</w:tbl>`;
}

function recordSection(
  record: YouTubeExportRecord,
  index: number,
  isLast: boolean
) {
  return `<w:p><w:pPr><w:spacing w:before="320" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="30"/></w:rPr><w:t>${xml(
    `${index + 1}. ${record.title}`
  )}</w:t></w:r></w:p>
${recordTable(record)}
<w:p><w:pPr><w:spacing w:before="160" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="0A66C2"/></w:rPr><w:t>Description:</w:t></w:r></w:p>
<w:p>${wordText(record.description)}</w:p>
${isLast ? '' : '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'}`;
}

export function createDocxBytes(
  records: YouTubeExportRecord[],
  context: YouTubeExportContext
): Uint8Array {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>${wordText(context.title)}</w:p>
    <w:p><w:r><w:t>${records.length} videos</w:t></w:r></w:p>
    ${records
      .map((record, index) =>
        recordSection(record, index, index === records.length - 1)
      )
      .join('')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="567" w:right="567" w:bottom="567" w:left="567" w:header="284" w:footer="284" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
  <w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="B8C0CC"/><w:left w:val="single" w:sz="4" w:color="B8C0CC"/><w:bottom w:val="single" w:sz="4" w:color="B8C0CC"/><w:right w:val="single" w:sz="4" w:color="B8C0CC"/><w:insideH w:val="single" w:sz="4" w:color="D5DAE2"/><w:insideV w:val="single" w:sz="4" w:color="D5DAE2"/></w:tblBorders></w:tblPr></w:style>
</w:styles>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(context.title)}</dc:title><dc:creator>Export YouTube Playlist</dc:creator></cp:coreProperties>`;
  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Export YouTube Playlist</Application></Properties>`;

  return zipSync(
    {
      '[Content_Types].xml': strToU8(contentTypes),
      '_rels/.rels': strToU8(rootRels),
      'word/document.xml': strToU8(documentXml),
      'word/_rels/document.xml.rels': strToU8(documentRels),
      'word/styles.xml': strToU8(styles),
      'docProps/core.xml': strToU8(core),
      'docProps/app.xml': strToU8(app),
    },
    { level: 6 }
  );
}
