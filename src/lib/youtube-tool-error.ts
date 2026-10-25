export type YouTubeToolErrorMessages = {
  fallback: string;
  invalidUrl: string;
  notFound: string;
  network: string;
  connection: string;
  timeout: string;
  configuration: string;
  quota: string;
  rateLimit: string;
  upstream: string;
  export: string;
};

export function getYouTubeToolErrorMessage(
  error: unknown,
  messages: YouTubeToolErrorMessages
): string {
  if (!(error instanceof Error)) return messages.fallback;

  const message = error.message;
  if (message.startsWith('export_generation_failed:')) return messages.export;
  if (message.startsWith('network_request_failed:')) return messages.network;
  if (message.startsWith('invalid_youtube_url:')) return messages.invalidUrl;
  if (message.startsWith('youtube_resource_not_found:'))
    return messages.notFound;
  if (message.startsWith('youtube_api_key_missing:'))
    return messages.configuration;
  if (message.startsWith('quota_exceeded:')) return messages.quota;
  if (message.startsWith('request_timeout:')) return messages.timeout;
  if (message.startsWith('upstream_request_failed:')) return messages.upstream;
  if (/please wait before|too many requests/i.test(message))
    return messages.rateLimit;

  // Browser fetch failures have no API envelope. Do not describe these as
  // failures between our server and YouTube, or treat every TypeError as one.
  if (
    error instanceof TypeError &&
    /failed to fetch|fetch failed|networkerror|load failed/i.test(message)
  ) {
    return messages.connection;
  }
  return messages.fallback;
}
