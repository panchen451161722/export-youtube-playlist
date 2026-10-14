import {
  createTourCollection,
  createTourCollections,
  type TourCollection,
} from './tour';

export type TourDraft = Pick<
  TourCollection,
  | 'frequency'
  | 'notifyMissing'
  | 'notifyAdded'
  | 'notifyRestored'
  | 'emailDelivery'
  | 'exportFrequency'
  | 'enabled'
> & { name: string; url: string; source: '' | 'playlist' | 'channel' };
export type TourScene = {
  collections: TourCollection[];
  selectedId: string | null;
  tab: 'missing' | 'latest';
  sort: 'default' | 'title' | 'views';
  page: number;
  search: string;
  modal: 'create' | 'update' | 'export' | 'delete' | null;
  editingId: string | null;
  draft: TourDraft;
  exportKind: 'latest' | 'missing';
  exporting: boolean;
  notice: 'created' | 'preview-exported' | 'exported' | null;
};

export const TOUR_URL =
  'https://www.youtube.com/playlist?list=PLdemoTopTracks2026';
export const TOUR_FRAMES = [
  { step: 0, target: 'add', duration: 2200 },
  { step: 0, target: 'source', duration: 1500 },
  { step: 0, target: 'url', duration: 2400 },
  { step: 0, target: 'frequency', duration: 1600 },
  { step: 1, target: 'notifyMissing', duration: 1400 },
  { step: 1, target: 'emailDelivery', duration: 1500 },
  { step: 1, target: 'create', duration: 1700 },
  { step: 1, target: 'view-new', duration: 2500 },
  { step: 2, target: 'tab-latest', duration: 2200 },
  { step: 2, target: 'back', duration: 3200 },
  { step: 3, target: 'view-old', duration: 1600 },
  { step: 3, target: 'tab-latest', duration: 3600 },
  { step: 4, target: 'sort', duration: 1800 },
  { step: 4, target: 'page-2', duration: 2000 },
  { step: 4, target: 'export', duration: 2800 },
  { step: 5, target: 'export-missing', duration: 1800 },
  { step: 5, target: 'export-confirm', duration: 1800 },
  { step: 5, target: '', duration: 2200 },
  { step: 5, target: '', duration: 2800 },
] as const;
export const TOUR_CHAPTERS = [0, 4, 8, 11, 12, 15];

export function blankTourDraft(): TourDraft {
  return {
    name: '',
    url: '',
    source: '',
    frequency: 'weekly',
    enabled: true,
    notifyMissing: true,
    notifyAdded: true,
    notifyRestored: true,
    emailDelivery: false,
    exportFrequency: 'weekly',
  };
}

/** Complete scene snapshots make pause, replay and chapter jumps deterministic. */
export function tourSceneAt(frame: number): TourScene {
  const scene: TourScene = {
    collections: createTourCollections(),
    selectedId: null,
    tab: 'missing',
    sort: 'default',
    page: 1,
    search: '',
    modal: null,
    editingId: null,
    draft: blankTourDraft(),
    exportKind: 'latest',
    exporting: false,
    notice: null,
  };
  if (frame >= 1 && frame <= 6) scene.modal = 'create';
  if (frame >= 2) scene.draft.source = 'playlist';
  if (frame >= 3) scene.draft.url = TOUR_URL;
  if (frame >= 4) scene.draft.frequency = 'daily';
  if (frame >= 6) scene.draft.emailDelivery = true;
  if (frame >= 7)
    scene.collections.push(
      createTourCollection('new', { emailDelivery: true })
    );
  if (frame === 7) scene.notice = 'created';
  if (frame === 8 || frame === 9) scene.selectedId = 'new';
  if (frame === 9) scene.tab = 'latest';
  if (frame >= 11) scene.selectedId = 'old';
  if (frame >= 12) scene.tab = 'latest';
  if (frame >= 13) scene.sort = 'views';
  if (frame >= 14) scene.page = 2;
  if (frame >= 15 && frame <= 17) scene.modal = 'export';
  if (frame >= 16) scene.exportKind = 'missing';
  if (frame === 17) scene.exporting = true;
  if (frame === 18) scene.notice = 'preview-exported';
  return scene;
}
