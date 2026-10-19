import handler from '@tanstack/react-start/server-entry';

import { ensureCloudflareEnv } from './core/cloudflare-env';
import { privateDocumentHeaders } from './lib/private-document';
import { paraglideMiddleware } from './paraglide/server.js';

// Custom server entry — wraps every request in Paraglide's middleware so
// getLocale() resolves per-request (AsyncLocalStorage) during SSR.
export default {
  async fetch(req: Request): Promise<Response> {
    await ensureCloudflareEnv();
    const response = await paraglideMiddleware(req, () => handler.fetch(req));
    const protectedHeaders = privateDocumentHeaders(req);
    if (!Object.keys(protectedHeaders).length) return response;
    // A fresh response permits headers even if an upstream returned an immutable response.
    const secured = new Response(response.body, response);
    for (const [name, value] of Object.entries(protectedHeaders))
      secured.headers.set(name, value);
    return secured;
  },
};
