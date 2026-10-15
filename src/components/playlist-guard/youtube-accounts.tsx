import { Link2, Youtube } from 'lucide-react';

import type { YoutubeConnectionsOverview } from '@/lib/youtube-connections/types';
import { Button } from '@/components/ui/button';

export function YoutubeAccounts({
  data,
  notice,
  loading,
  error,
  busy,
  onConnect,
  onDisconnect,
  onRetry,
  labels: l,
}: {
  data?: YoutubeConnectionsOverview;
  notice?: string;
  loading: boolean;
  error: boolean;
  busy: boolean;
  onConnect: (id?: string) => void;
  onDisconnect: (id: string) => void;
  onRetry: () => void;
  labels: Record<string, string>;
}) {
  return (
    <section
      id="youtube-accounts"
      className="border-border bg-card mb-7 rounded-xl border"
      aria-labelledby="youtube-accounts-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5 sm:px-6">
        <div>
          <h2
            id="youtube-accounts-heading"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Youtube className="size-5" />
            {l.accounts_title}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {l.accounts_description}
          </p>
        </div>
        <Button
          type="button"
          disabled={busy || loading || !data?.configured}
          onClick={() => onConnect()}
        >
          <Link2 />
          {l.connect_account}
        </Button>
      </div>
      <div className="space-y-4 p-5 sm:px-6">
        {notice && (
          <p role="status" className="bg-secondary rounded-lg p-3 text-sm">
            {l[notice + '_notice']}
          </p>
        )}
        {loading ? (
          <p role="status" className="text-muted-foreground text-sm">
            {l.loading}
          </p>
        ) : error ? (
          <div role="alert">
            <p>{l.accounts_error}</p>
            <Button variant="outline" onClick={onRetry}>
              {l.retry}
            </Button>
          </div>
        ) : (
          <>
            {!data?.configured && (
              <p role="status" className="bg-secondary rounded-lg p-3 text-sm">
                {l.oauth_unavailable}
              </p>
            )}
            {!data?.accounts.length ? (
              <p className="text-muted-foreground py-3 text-center text-sm">
                {l.accounts_empty}
              </p>
            ) : (
              <ul className="divide-y">
                {data.accounts.map((account) => (
                  <li
                    key={account.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{account.channelTitle}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {account.channelId}
                      </p>
                      <p
                        className={
                          account.status === 'connected'
                            ? 'mt-1 text-sm text-green-700 dark:text-green-400'
                            : 'text-muted-foreground mt-1 text-sm'
                        }
                      >
                        {l['account_' + account.status]}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        type="button"
                        disabled={busy || !data.configured}
                        onClick={() => onConnect(account.id)}
                      >
                        {l.reconnect_account}
                      </Button>
                      {account.status !== 'disconnected' && (
                        <Button
                          variant="ghost"
                          type="button"
                          disabled={busy}
                          onClick={() => onDisconnect(account.id)}
                        >
                          {l.disconnect_account}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-muted-foreground text-xs leading-5">
              {l.accounts_note}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
