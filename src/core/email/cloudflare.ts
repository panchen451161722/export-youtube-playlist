import { render } from '@react-email/components';

import type {
  EmailConfigs,
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from '.';

/**
 * Cloudflare Email Service provider configs
 * @docs https://developers.cloudflare.com/email-service/get-started/send-emails/
 */
export interface CloudflareEmailConfigs extends EmailConfigs {
  apiToken: string;
  accountId: string;
  defaultFrom?: string;
}

/**
 * Cloudflare Email Service provider implementation
 * Uses the REST API: POST /client/v4/accounts/{account_id}/email/sending/send
 */
export class CloudflareEmailProvider implements EmailProvider {
  readonly name = 'cloudflare';
  configs: CloudflareEmailConfigs;

  constructor(configs: CloudflareEmailConfigs) {
    this.configs = configs;
  }

  async sendEmail(email: EmailMessage): Promise<EmailSendResult> {
    try {
      const from = email.from || this.configs.defaultFrom || '';
      const to = email.to;

      let html = email.html;
      if (email.react) {
        html = await render(email.react);
      }

      const body: Record<string, unknown> = {
        from,
        to,
        subject: email.subject,
      };

      if (html) body.html = html;
      if (email.text) body.text = email.text;
      if (!html && !email.text) body.text = '';

      if (email.cc) body.cc = email.cc;
      if (email.bcc) body.bcc = email.bcc;
      if (email.replyTo) body.reply_to = email.replyTo;
      if (email.headers) body.headers = email.headers;
      if (email.attachments)
        body.attachments = email.attachments.map((attachment) => ({
          filename: attachment.filename,
          content: Buffer.isBuffer(attachment.content)
            ? attachment.content.toString('base64')
            : attachment.content,
          type: attachment.contentType || 'application/octet-stream',
          disposition: 'attachment',
        }));

      const url = `https://api.cloudflare.com/client/v4/accounts/${this.configs.accountId}/email/sending/send`;

      const resp = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.configs.apiToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = (await resp.json().catch(() => ({}))) as {
        success?: boolean;
        errors?: { message?: string }[];
        messages?: string[];
        result?: {
          delivered?: string[];
          queued?: string[];
          permanent_bounces?: string[];
        };
      };

      if (!resp.ok || data.success === false) {
        const errMsg =
          data?.errors?.[0]?.message ||
          data?.messages?.[0] ||
          `Request failed (${resp.status})`;
        return {
          success: false,
          error: errMsg,
          provider: this.name,
        };
      }

      if (
        data.result?.permanent_bounces?.length ||
        !(
          (data.result?.delivered?.length ?? 0) +
          (data.result?.queued?.length ?? 0)
        )
      ) {
        return {
          success: false,
          error: 'The provider did not accept the email recipient.',
          provider: this.name,
        };
      }
      return {
        success: true,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }
}

/**
 * Create Cloudflare Email provider with configs
 */
export function createCloudflareEmailProvider(
  configs: CloudflareEmailConfigs
): CloudflareEmailProvider {
  return new CloudflareEmailProvider(configs);
}
