#!/usr/bin/env node
// Local-only mail catcher. Captured messages never leave this computer.
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';

const directory = resolve('data/guard-mail-preview');
await mkdir(directory, { recursive: true, mode: 0o700 });
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]
  );
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1:3103');
    if (request.method === 'POST' && url.pathname === '/mail') {
      let size = 0;
      const chunks = [];
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 2_000_000) {
          response.writeHead(413).end();
          return;
        }
        chunks.push(chunk);
      }
      const message = JSON.parse(Buffer.concat(chunks).toString());
      const id = randomUUID();
      await writeFile(
        join(directory, `${id}.json`),
        JSON.stringify(
          { ...message, capturedAt: new Date().toISOString() },
          null,
          2
        ),
        { mode: 0o600 }
      );
      response
        .writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify({ id }));
      return;
    }
    if (request.method !== 'GET') {
      response.writeHead(405).end();
      return;
    }
    const files = (await readdir(directory)).filter((name) =>
      /^[a-f0-9-]+\.json$/.test(name)
    );
    const messages = await Promise.all(
      files.map(async (name) => ({
        id: name.slice(0, -5),
        ...JSON.parse(await readFile(join(directory, name), 'utf8')),
      }))
    );
    messages.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    const selected = url.searchParams.get('message');
    const visibleMessages = selected
      ? messages.filter((m) => m.id === selected)
      : messages;
    if (url.pathname.startsWith('/attachment/')) {
      const [, , id, index] = url.pathname.split('/');
      const attachment = messages.find((m) => m.id === id)?.attachments?.[
        Number(index)
      ];
      if (!attachment) {
        response.writeHead(404).end();
        return;
      }
      response
        .writeHead(200, {
          'content-type': attachment.contentType || 'application/octet-stream',
          'content-disposition': 'attachment; filename="playlist-backup.json"',
          'cache-control': 'no-store',
        })
        .end(Buffer.from(attachment.content, 'base64'));
      return;
    }
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy':
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    });
    response.end(
      `<!doctype html><html lang="zh"><meta charset="utf-8"><title>本地邮件收件箱</title><style>body{font:15px/1.7 system-ui;background:#f5f2eb;color:#1a213c;max-width:1000px;margin:40px auto;padding:0 20px}article{background:white;padding:24px;margin:20px 0;border:1px solid #ddd;border-radius:16px}pre{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#666}a{color:#315aa1}</style><h1>本地邮件收件箱</h1><p>仅用于开发验收。这里的邮件没有投递到真实邮箱。</p><p><a href="/">刷新</a></p>${visibleMessages.map((m) => `<article><h2>${escape(m.subject)}</h2><small>${escape(m.capturedAt)} · ${escape(m.to)}</small><pre>${escape(m.text || m.html || '')}</pre>${(m.attachments || []).map((a, i) => `<p><a href="/attachment/${m.id}/${i}">${escape(a.filename)}</a></p>`).join('')}</article>`).join('') || '<p>尚无邮件</p>'}</html>`
    );
  } catch {
    response.writeHead(400).end('Invalid preview request');
  }
});
server.listen(3103, '127.0.0.1', () =>
  console.info('Local mail catcher: http://127.0.0.1:3103')
);
