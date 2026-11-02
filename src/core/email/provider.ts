import type { EmailProvider } from '.';
import { CloudflareEmailProvider } from './cloudflare';
import { PreviewEmailProvider, previewMailUrl } from './preview';
import { ResendProvider } from './resend';

/**
 * Build the configured email provider from admin settings.
 * Returns null if the chosen provider is not fully configured.
 */
export function getEmailProvider(
  configs: Record<string, string>
): { provider: EmailProvider; from: string } | null {
  const preview = previewMailUrl();
  if (preview)
    return {
      provider: new PreviewEmailProvider(preview),
      from: 'preview@localhost',
    };
  const selected = configs.email_provider || 'resend';

  if (selected === 'cloudflare') {
    const apiToken = configs.cloudflare_email_api_token;
    const accountId = configs.cloudflare_email_account_id;
    const from = configs.cloudflare_email_sender_email;
    if (!apiToken || !accountId || !from) return null;
    return {
      provider: new CloudflareEmailProvider({
        apiToken,
        accountId,
        defaultFrom: from,
      }),
      from,
    };
  }

  // Default: resend
  const apiKey = configs.resend_api_key;
  const from = configs.resend_sender_email;
  if (!apiKey || !from) return null;
  return { provider: new ResendProvider({ apiKey, defaultFrom: from }), from };
}
