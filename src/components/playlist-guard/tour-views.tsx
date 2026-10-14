import type { CollectionDetailView } from '@/lib/playlist-guard/presentation';
import type { TourCollection } from '@/lib/playlist-guard/tour';

import {
  CollectionDetail,
  CollectionList,
  type CollectionDetailProps,
  type CollectionListProps,
} from './collection-views';

function tourView(collection: TourCollection): CollectionDetailView {
  return {
    ...collection,
    url: collection.url ?? '',
    createdAt: '',
    lastSyncedAt: null,
    nextSyncAt: null,
    lastError: null,
    itemCount: collection.items.length,
    missingCount: collection.missing.length,
  };
}
export function TourCollectionList(
  props: Omit<CollectionListProps, 'collections'> & {
    collections: TourCollection[];
  }
) {
  return (
    <CollectionList {...props} collections={props.collections.map(tourView)} />
  );
}
export function TourCollectionDetail(
  props: Omit<CollectionDetailProps, 'collection'> & {
    collection: TourCollection;
  }
) {
  return (
    <CollectionDetail {...props} collection={tourView(props.collection)} />
  );
}
