import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createTourCollection,
  createTourCollections,
  sortedTourVideos,
  TOUR_PAGE_SIZE,
} from './tour';

test('tour search and sorting preserve sample order and isolate latest/missing data', () => {
  const initial = createTourCollections()[0];
  const original = JSON.stringify(initial);
  assert.ok(initial.items.length > TOUR_PAGE_SIZE);
  assert.equal(
    sortedTourVideos(initial, 'latest', 'default', 'nirvana').length,
    1
  );
  assert.equal(
    sortedTourVideos(initial, 'latest', 'default', 'rick astley').length,
    0
  );
  assert.equal(
    sortedTourVideos(initial, 'missing', 'default', 'rick astley').length,
    1
  );
  const byViews = sortedTourVideos(initial, 'latest', 'views');
  assert.ok(
    byViews.every(
      (item, index) =>
        index === 0 || (byViews[index - 1].views ?? -1) >= (item.views ?? -1)
    )
  );
  assert.equal(JSON.stringify(initial), original);
  const next = createTourCollection('new');
  next.items[0].title = 'Edited demo';
  assert.notEqual(
    createTourCollection('new').items[0].title,
    next.items[0].title
  );
});
