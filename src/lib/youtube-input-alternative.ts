const youtubeHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

export type YouTubeInputAlternative = {
  kind: 'channel' | 'video';
  input: string;
};

// Only recommend tools for inputs they can use. Canonical URLs also avoid
// carrying tracking parameters or unrelated user data to the next page.
export function getYouTubeInputAlternative(
  value: string
): YouTubeInputAlternative | null {
  const input = value.trim();
  if (!input || input.length > 2048) return null;
  if (/^UC[A-Za-z0-9_-]{22}$/.test(input)) {
    return {
      kind: 'channel',
      input: `https://www.youtube.com/channel/${input}`,
    };
  }
  if (/^@[A-Za-z0-9._-]{3,100}$/.test(input)) {
    return { kind: 'channel', input: `https://www.youtube.com/${input}` };
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) {
    return { kind: 'video', input: `https://www.youtube.com/watch?v=${input}` };
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return null;
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !youtubeHosts.has(url.hostname.toLowerCase()) ||
    url.username ||
    url.password ||
    url.port
  )
    return null;

  // A video watched within a playlist is still a valid playlist input.
  if (/^[A-Za-z0-9_-]{10,80}$/.test(url.searchParams.get('list') ?? '')) {
    return null;
  }
  const parts = url.pathname.split('/').filter(Boolean);
  const shortHost = ['youtu.be', 'www.youtu.be'].includes(
    url.hostname.toLowerCase()
  );
  const videoId = shortHost
    ? parts[0]
    : parts[0] === 'watch'
      ? url.searchParams.get('v')
      : ['shorts', 'live', 'embed'].includes(parts[0])
        ? parts[1]
        : null;
  if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return {
      kind: 'video',
      input: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }
  if (shortHost) return null;
  if (parts[0]?.startsWith('@') && parts[0].length > 1) {
    return { kind: 'channel', input: `https://www.youtube.com/${parts[0]}` };
  }
  if (
    (parts[0] === 'channel' && /^UC[A-Za-z0-9_-]{22}$/.test(parts[1] ?? '')) ||
    (['c', 'user'].includes(parts[0]) && !!parts[1])
  ) {
    return {
      kind: 'channel',
      input: `https://www.youtube.com/${parts[0]}/${parts[1]}`,
    };
  }
  return null;
}

export function validateToolInputSearch(search: Record<string, unknown>) {
  const alternative =
    typeof search.input === 'string'
      ? getYouTubeInputAlternative(search.input)
      : null;
  return alternative ? { input: alternative.input } : {};
}
