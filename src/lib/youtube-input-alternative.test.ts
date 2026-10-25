import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getYouTubeInputAlternative,
  validateToolInputSearch,
} from './youtube-input-alternative';

test('recognizes channel URLs, handles and IDs and strips unrelated URL data', () => {
  for (const input of [
    '@coreyms',
    'youtube.com/@coreyms/videos',
    'https://www.youtube.com/@coreyms?si=tracking#about',
  ]) {
    assert.deepEqual(getYouTubeInputAlternative(input), {
      kind: 'channel',
      input: 'https://www.youtube.com/@coreyms',
    });
  }
  for (const input of [
    'UCCezIgC97PvUuR4_gbFUs5g',
    'https://youtube.com/channel/UCCezIgC97PvUuR4_gbFUs5g/playlists',
  ]) {
    assert.deepEqual(getYouTubeInputAlternative(input), {
      kind: 'channel',
      input: 'https://www.youtube.com/channel/UCCezIgC97PvUuR4_gbFUs5g',
    });
  }
  for (const path of ['user/coreyms', 'c/coreyms']) {
    assert.equal(
      getYouTubeInputAlternative(`https://youtube.com/${path}/videos`)?.input,
      `https://www.youtube.com/${path}`
    );
  }
});

test('recognizes videos, shorts, live and embed URLs without passing tracking parameters', () => {
  for (const input of [
    'YYXdXT2l-Gg',
    'https://youtu.be/YYXdXT2l-Gg?t=10',
    'https://m.youtube.com/watch?v=YYXdXT2l-Gg&si=tracking',
    'https://youtube.com/shorts/YYXdXT2l-Gg',
    'https://youtube.com/live/YYXdXT2l-Gg',
    'https://youtube.com/embed/YYXdXT2l-Gg',
  ]) {
    assert.deepEqual(getYouTubeInputAlternative(input), {
      kind: 'video',
      input: 'https://www.youtube.com/watch?v=YYXdXT2l-Gg',
    });
  }
});

test('playlist IDs take precedence over video recommendations', () => {
  for (const input of [
    'https://youtube.com/playlist?list=PL-osiE80TeTskrap',
    'https://youtube.com/watch?v=YYXdXT2l-Gg&list=PL-osiE80TeTskrap',
    'https://youtu.be/YYXdXT2l-Gg?list=PL-osiE80TeTskrap',
  ]) {
    assert.equal(getYouTubeInputAlternative(input), null);
  }
});

test('does not recommend tools for unrelated or malformed inputs', () => {
  for (const input of [
    '',
    'not a URL',
    'https://example.com/watch?v=YYXdXT2l-Gg',
    'https://youtube.com.evil.test/@coreyms',
    'https://youtube.com@evil.test/@coreyms',
    'javascript:alert(1)',
    'https://youtube.com/watch?v=bad',
    'https://youtube.com/feed/subscriptions',
    'https://youtube.com/playlist',
    'https://youtu.be/@coreyms',
    'https://youtube.com/channel/invalid',
    'a'.repeat(2049),
  ]) {
    assert.equal(getYouTubeInputAlternative(input), null, input);
  }
});

test('destination search validation accepts only recognized input and discards other parameters', () => {
  assert.deepEqual(
    validateToolInputSearch({
      input: 'https://youtu.be/YYXdXT2l-Gg?si=tracking',
      next: 'https://example.com',
    }),
    { input: 'https://www.youtube.com/watch?v=YYXdXT2l-Gg' }
  );
  for (const input of [
    undefined,
    [],
    {},
    'javascript:alert(1)',
    'https://example.com',
  ]) {
    assert.deepEqual(validateToolInputSearch({ input }), {});
  }
});
