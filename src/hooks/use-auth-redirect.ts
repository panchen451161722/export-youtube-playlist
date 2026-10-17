import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';

import { getAuthRedirect, getSignInHref } from '@/lib/auth-redirect';

export function useSignInHref() {
  const href = useLocation({ select: (location) => location.href });
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // Fragments are absent on the server; add them after hydration so React
  // updates the actual link instead of leaving a mismatched SSR href behind.
  return getSignInHref(hydrated ? href : href.split('#')[0]);
}

export function useAuthRedirect() {
  const search = useLocation({ select: (location) => location.searchStr });
  return getAuthRedirect(search);
}
