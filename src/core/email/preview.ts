import type { EmailMessage, EmailProvider, EmailSendResult } from '.';

/** Explicit local mail catcher. Never available in a Cloudflare runtime. */
export function previewMailUrl(): string | null {
  const runtime = globalThis as typeof globalThis & {
    __CF_ENV__?: unknown;
    __env__?: unknown;
  };
  if (
    runtime.__CF_ENV__ ||
    runtime.__env__ ||
    process.env.DATABASE_PROVIDER === 'd1'
  )
    return null;
  const value = process.env.PLAYLIST_GUARD_MAIL_PREVIEW_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      !url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export class PreviewEmailProvider implements EmailProvider {
  readonly name = 'local-preview';
  configs = {};
  constructor(private readonly url: string) {}
  async sendEmail(email: EmailMessage): Promise<EmailSendResult> {
    try {
      const html = email.react
        ? await (await import('@react-email/components')).render(email.react)
        : email.html;
      const response = await fetch(this.url, {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: {
          'content-type': 'application/json',
          'idempotency-key': email.idempotencyKey ?? '',
        },
        body: JSON.stringify({
          ...email,
          react: undefined,
          html,
          attachments: email.attachments?.map((attachment) => ({
            ...attachment,
            content: Buffer.isBuffer(attachment.content)
              ? attachment.content.toString('base64')
              : attachment.content,
          })),
        }),
      });
      return {
        success: response.ok,
        provider: this.name,
        messageId: response.ok ? email.idempotencyKey : undefined,
      };
    } catch {
      return { success: false, provider: this.name };
    }
  }
}
