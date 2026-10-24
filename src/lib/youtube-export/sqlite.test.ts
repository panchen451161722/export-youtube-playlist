import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createClient } from '@libsql/client';

import { generateYouTubeExportFiles } from './formats';
import { YOUTUBE_EXPORT_FORMATS, type YouTubeExportRecord } from './types';

const record: YouTubeExportRecord = {
  title: 'A title with 中文 and "quotes"',
  description: 'Line one\nLine two #Python',
  thumbnailUrl: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
  channelName: 'Example Channel',
  views: 100,
  likes: 10,
  comments: null,
  durationSeconds: 3723,
  durationMinutes: 62.05,
  durationTimestamp: '1:02:03',
  duration: '1 Hours, 2 Minutes, 3 Seconds',
  uploadedTime: '2024-01-02T03:04:05',
  videoUrl: 'https://www.youtube.com/watch?v=abc123',
  tags: ['#python', '#data science'],
  descriptionTags: ['#Python'],
  emails: ['contact@example.com'],
  links: ['https://example.com'],
};

test('SQLite exports use the real WASM runtime and recover after initialization fails', async (t) => {
  const wasm = await readFile(
    new URL(import.meta.resolve('@sqlite.org/sqlite-wasm/sqlite3.wasm'))
  );
  const folder = await mkdtemp(join(tmpdir(), 'youtube-export-sqlite-'));
  const originalFetch = globalThis.fetch;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalLocation = Object.getOwnPropertyDescriptor(
    globalThis,
    'location'
  );
  let failInitialization = true;
  let wasmRequests = 0;

  // The browser package needs browser globals. Serve its actual WASM bytes
  // locally so the test exercises compilation without any network requests.
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: new URL('http://localhost/sqlite-export-test'),
  });
  globalThis.fetch = async (input) => {
    assert.match(String(input), /\/sqlite3\.wasm$/);
    wasmRequests += 1;
    if (failInitialization) throw new Error('simulated_wasm_fetch_failure');
    return new Response(new Uint8Array(wasm), {
      headers: { 'Content-Type': 'application/wasm' },
    });
  };
  t.after(async () => {
    globalThis.fetch = originalFetch;
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
    if (originalLocation) {
      Object.defineProperty(globalThis, 'location', originalLocation);
    } else {
      Reflect.deleteProperty(globalThis, 'location');
    }
    await rm(folder, { recursive: true, force: true });
  });

  const { createSqliteBytes } = await import('./sqlite');

  // Await each subtest to keep the shared browser globals and module cache serial.
  await t.test(
    'retries initialization in the same module after a failed load',
    async () => {
      await assert.rejects(
        createSqliteBytes([record]),
        /simulated_wasm_fetch_failure/
      );
      const failedRequestCount = wasmRequests;
      failInitialization = false;
      const bytes = await createSqliteBytes([record]);
      assert.ok(wasmRequests > failedRequestCount);
      assert.equal(
        new TextDecoder().decode(bytes.slice(0, 16)),
        'SQLite format 3\0'
      );
    }
  );

  await t.test(
    'creates a readable database preserving all 17 column values',
    async () => {
      const bytes = await createSqliteBytes([record]);
      const databasePath = join(folder, 'playlist.sqlite');
      await writeFile(databasePath, bytes);
      const client = createClient({ url: `file:${databasePath}` });
      try {
        const result = await client.execute('SELECT * FROM videos');
        assert.equal(result.rows.length, 1);
        assert.deepEqual(Object.fromEntries(Object.entries(result.rows[0])), {
          Title: record.title,
          Description: record.description,
          Thumbnail_url: record.thumbnailUrl,
          Channel_name: record.channelName,
          Views: '100',
          Likes: '10',
          Comments: '',
          Duration_in_seconds: '3723',
          Duration_in_minutes: '62.05',
          Duration_in_timestamp: '1:02:03',
          Duration: record.duration,
          Uploaded_Time: record.uploadedTime,
          Video_url: record.videoUrl,
          Tags: '[#python, #data science]',
          Tags__in_description_: '[#Python]',
          Emails__in_description_: '[contact@example.com]',
          Links__in_description_: '[https://example.com]',
        });
      } finally {
        client.close();
      }
    }
  );

  await t.test(
    'generates all 13 formats when no formats are selected',
    async () => {
      const initializedRequestCount = wasmRequests;
      const files = await generateYouTubeExportFiles({
        records: [record],
        context: { title: 'Reference Playlist', source: 'playlist' },
        formats: [],
      });
      assert.deepEqual(
        files.map((file) => file.format),
        YOUTUBE_EXPORT_FORMATS.map((format) => format.key)
      );
      assert.equal(files.length, 13);
      assert.equal(new Set(files.map((file) => file.fileName)).size, 13);
      assert.ok(files.every((file) => file.bytes.length > 0));
      assert.equal(wasmRequests, initializedRequestCount);
      const sqliteFile = files.find((file) => file.format === 'sqlite');
      assert.ok(sqliteFile);
      assert.equal(
        new TextDecoder().decode(sqliteFile.bytes.slice(0, 16)),
        'SQLite format 3\0'
      );
    }
  );
});
