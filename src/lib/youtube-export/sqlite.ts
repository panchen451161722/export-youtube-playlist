import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

import { YOUTUBE_EXPORT_COLUMNS, type YouTubeExportRecord } from './types';

let sqlitePromise: ReturnType<typeof sqlite3InitModule> | undefined;

function sqliteValue(
  record: YouTubeExportRecord,
  key: keyof YouTubeExportRecord
) {
  const value = record[key];
  return Array.isArray(value) ? `[${value.join(', ')}]` : String(value ?? '');
}

function sqliteColumnName(label: string) {
  return label.replace(/[^a-zA-Z0-9_]/g, '_');
}

export async function createSqliteBytes(
  records: YouTubeExportRecord[]
): Promise<Uint8Array> {
  sqlitePromise ??= sqlite3InitModule({
    print: () => undefined,
    printErr: () => undefined,
  });
  const sqlite3 = await sqlitePromise;
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  try {
    db.exec(
      `CREATE TABLE videos (
        ${YOUTUBE_EXPORT_COLUMNS.map(
          (column) => `"${sqliteColumnName(column.label)}" TEXT`
        ).join(',\n')}
      );`
    );
    const placeholders = YOUTUBE_EXPORT_COLUMNS.map(() => '?').join(',');
    const columns = YOUTUBE_EXPORT_COLUMNS.map(
      (column) => `"${sqliteColumnName(column.label)}"`
    ).join(',');
    const statement = db.prepare(
      `INSERT INTO videos (${columns}) VALUES (${placeholders})`
    );
    try {
      for (const record of records) {
        statement
          .bind(
            YOUTUBE_EXPORT_COLUMNS.map((column) =>
              sqliteValue(record, column.key)
            )
          )
          .stepReset();
      }
    } finally {
      statement.finalize();
    }
    return sqlite3.capi.sqlite3_js_db_export(db);
  } finally {
    db.close();
  }
}
