import { useEffect, useState } from 'react';
import { useSearch } from '@tanstack/react-router';

import { validateToolInputSearch } from '@/lib/youtube-input-alternative';

export function useToolInput() {
  const search = useSearch({ strict: false });
  const initialInput = validateToolInputSearch(search).input ?? '';
  const [input, setInput] = useState(initialInput);
  useEffect(() => {
    setInput(initialInput);
  }, [initialInput]);
  return [input, setInput] as const;
}
