import { useState } from 'react';

import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';

import { GuestTrialDecision } from './guest-trial-decision';

/** Development-only preview: exercises the real decision UI without Stripe or account data. */
export function GuestTrialPreview() {
  const [state, setState] = useState<'used' | 'cancelling' | 'existing'>(
    'used'
  );
  const [notice, setNotice] = useState(false);
  return (
    <main className="bg-background min-h-screen">
      <GuestTrialDecision
        cancelling={state === 'cancelling'}
        existing={state === 'existing'}
        planId="pro"
        busy={false}
        error={false}
        onClose={() => setNotice(true)}
        onRetry={() => setState('used')}
        onContinue={() => setNotice(true)}
      >
        <div className="space-y-3 rounded-lg border border-dashed p-3">
          <p className="text-muted-foreground text-xs">
            {m['guestTrial.preview_note']()}
          </p>
          <div className="flex flex-wrap gap-2">
            {(['used', 'cancelling', 'existing'] as const).map((value) => (
              <Button
                key={value}
                variant={state === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setState(value);
                  setNotice(false);
                }}
              >
                {value === 'used'
                  ? m['guestTrial.preview_used']()
                  : value === 'cancelling'
                    ? m['guestTrial.preview_cancelling']()
                    : m['guestTrial.preview_existing']()}
              </Button>
            ))}
          </div>
          {notice && (
            <p role="status" className="text-sm">
              {m['guestTrial.preview_action']()}
            </p>
          )}
        </div>
      </GuestTrialDecision>
    </main>
  );
}
