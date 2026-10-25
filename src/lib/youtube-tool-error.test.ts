import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getYouTubeToolErrorMessage,
  type YouTubeToolErrorMessages,
} from './youtube-tool-error';

const messages: YouTubeToolErrorMessages = {
  fallback: 'Try again later',
  invalidUrl: 'Check the URL',
  notFound: 'Resource not found',
  network: 'Server could not connect to YouTube',
  connection: 'Check your internet connection',
  timeout: 'YouTube timed out',
  configuration: 'Service configuration problem',
  quota: 'YouTube quota exhausted',
  rateLimit: 'Wait before retrying',
  upstream: 'YouTube could not process the request',
  export: 'File generation failed',
};

test('reports the observed server network failure without blaming the URL', () => {
  assert.equal(
    getYouTubeToolErrorMessage(
      new Error('network_request_failed: YouTube could not be reached.'),
      messages
    ),
    messages.network
  );
});

test('keeps browser connectivity distinct from server-to-YouTube connectivity', () => {
  for (const message of [
    'Failed to fetch',
    'Load failed',
    'NetworkError when attempting to fetch resource.',
    'fetch failed',
  ]) {
    assert.equal(
      getYouTubeToolErrorMessage(new TypeError(message), messages),
      messages.connection
    );
  }
  assert.equal(
    getYouTubeToolErrorMessage(
      new TypeError('Unexpected undefined value'),
      messages
    ),
    messages.fallback
  );
});

test('distinguishes invalid input, unavailable resources and service errors', () => {
  const cases = {
    invalid_youtube_url: messages.invalidUrl,
    youtube_resource_not_found: messages.notFound,
    youtube_api_key_missing: messages.configuration,
    quota_exceeded: messages.quota,
    request_timeout: messages.timeout,
    upstream_request_failed: messages.upstream,
    export_generation_failed: messages.export,
  };
  for (const [code, expected] of Object.entries(cases)) {
    assert.equal(
      getYouTubeToolErrorMessage(new Error(`${code}: details`), messages),
      expected
    );
  }
  assert.equal(
    getYouTubeToolErrorMessage(
      new Error('Please wait before checking another channel.'),
      messages
    ),
    messages.rateLimit
  );
  assert.equal(
    getYouTubeToolErrorMessage(new Error('Too many requests'), messages),
    messages.rateLimit
  );
});

test('unknown errors use neutral copy rather than telling users to fix their link', () => {
  for (const error of [
    null,
    {},
    new Error('Bad Gateway'),
    new Error('The channel could not be loaded.'),
  ]) {
    assert.equal(
      getYouTubeToolErrorMessage(error, messages),
      messages.fallback
    );
  }
});
