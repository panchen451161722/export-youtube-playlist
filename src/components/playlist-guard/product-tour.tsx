import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Download,
  LoaderCircle,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { createTourCollection } from '@/lib/playlist-guard/tour';
import {
  blankTourDraft,
  TOUR_CHAPTERS,
  TOUR_FRAMES,
  TOUR_URL,
  tourSceneAt,
  type TourScene,
} from '@/lib/playlist-guard/tour-sequence';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';

import { TourCollectionForm } from './tour-form';
import { TourCollectionDetail, TourCollectionList } from './tour-views';

type Labels = Record<string, string>;
export function ProductTour({ labels: l }: { labels: Labels }) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [manualScene, setManualScene] = useState<TourScene | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [typedUrl, setTypedUrl] = useState('');
  const [cursor, setCursor] = useState({
    x: 40,
    y: 650,
    visible: false,
    clicking: false,
  });
  const windowRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const previousModalRef = useRef<TourScene['modal']>(null);
  const scriptedScene = useMemo(() => tourSceneAt(frame), [frame]);
  const scene = manualScene ?? scriptedScene;
  const selected = scene.collections.find((c) => c.id === scene.selectedId);
  const instruction = TOUR_FRAMES[frame];
  const chapterNames = [
    l.step_add,
    l.step_preferences,
    l.step_view,
    l.step_missing,
    l.step_browse,
    l.step_export,
  ];
  const chapterDescriptions = [
    l.caption_add,
    l.caption_preferences,
    l.caption_view,
    l.caption_missing,
    l.caption_browse,
    l.caption_export,
  ];
  const stop = () => setPlaying(false);
  function updateScene(
    update: Partial<TourScene> | ((s: TourScene) => TourScene)
  ) {
    stop();
    if (typeof update !== 'function' && update.modal && !scene.modal) {
      openerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }
    setManualScene((current) =>
      typeof update === 'function'
        ? update(current ?? scriptedScene)
        : { ...(current ?? scriptedScene), ...update }
    );
  }
  function restart(start = 0, play = true) {
    setManualScene(null);
    setFrame(start);
    setPlaying(play);
    setDownloadError(false);
    setTypedUrl('');
  }
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPlaying(!motion.matches);
    const onMotion = () => {
      if (motion.matches) setPlaying(false);
    };
    motion.addEventListener('change', onMotion);
    const onVisibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      motion.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  useEffect(() => {
    if (!playing || manualScene) return;
    const timer = window.setTimeout(
      () => setFrame((current) => (current + 1) % TOUR_FRAMES.length),
      instruction.duration
    );
    return () => window.clearTimeout(timer);
  }, [playing, frame, manualScene, instruction.duration]);
  useEffect(() => {
    if (frame !== 2 || !playing || manualScene) return;
    let count = 0;
    setTypedUrl('');
    const timer = window.setInterval(() => {
      count += 2;
      setTypedUrl(TOUR_URL.slice(0, count));
      if (count >= TOUR_URL.length) window.clearInterval(timer);
    }, 55);
    return () => window.clearInterval(timer);
  }, [frame, playing, manualScene]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [scene.selectedId]);
  useEffect(() => {
    if (!playing || manualScene || !instruction.target) {
      setCursor((c) => ({ ...c, visible: false }));
      return;
    }
    const root = windowRef.current;
    const target = root?.querySelector<HTMLElement>(
      `[data-tour="${instruction.target}"]`
    );
    if (!root || !target) return;
    const viewport = target.closest<HTMLElement>('[data-tour-scroller]');
    if (viewport) {
      const targetRect = target.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      if (
        targetRect.bottom > viewportRect.bottom - 32 ||
        targetRect.top < viewportRect.top + 24
      ) {
        viewport.scrollTo({
          top: Math.max(
            0,
            viewport.scrollTop +
              targetRect.top -
              viewportRect.top -
              viewport.clientHeight / 2
          ),
          behavior: 'instant',
        });
      }
    }
    const raf = requestAnimationFrame(() => {
      const r = target.getBoundingClientRect();
      const w = root.getBoundingClientRect();
      setCursor({
        x: r.left - w.left + r.width * 0.6,
        y: r.top - w.top + r.height * 0.6,
        visible: true,
        clicking: false,
      });
    });
    const click = window.setTimeout(
      () => setCursor((c) => ({ ...c, clicking: true })),
      instruction.duration - 400
    );
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(click);
    };
  }, [frame, playing, manualScene, instruction]);
  useEffect(() => {
    if (
      previousModalRef.current &&
      !scene.modal &&
      openerRef.current?.isConnected
    ) {
      openerRef.current.focus({ preventScroll: true });
      openerRef.current = null;
    }
    previousModalRef.current = scene.modal;
  }, [scene.modal]);
  // Manual dialogs get keyboard focus; playback never steals focus from the viewer.
  useEffect(() => {
    if (scene.modal && !playing)
      modalRef.current?.focus({ preventScroll: true });
  }, [scene.modal, playing]);

  const draft = useMemo(
    () =>
      !manualScene && frame === 2
        ? { ...scene.draft, url: typedUrl }
        : scene.draft,
    [manualScene, frame, scene.draft, typedUrl]
  );
  function openCollection(id: string) {
    updateScene({
      selectedId: id,
      tab: 'missing',
      page: 1,
      search: '',
      sort: 'default',
      notice: null,
    });
  }
  function editCollection(id: string) {
    const collection = scene.collections.find((c) => c.id === id);
    if (collection)
      updateScene({
        modal: 'update',
        editingId: id,
        draft: {
          ...collection,
          url: collection.url ?? '',
          source: collection.source,
        },
      });
  }
  async function exportSample() {
    if (!selected || downloadBusy) return;
    stop();
    setDownloadBusy(true);
    setDownloadError(false);
    try {
      const { downloadGuardExport } =
        await import('@/lib/playlist-guard/export');
      await downloadGuardExport(
        scene.exportKind === 'missing'
          ? selected.missing.map((item) => ({
              ...item,
              missingSince: l[item.missingSince ?? ''] ?? item.missingSince,
            }))
          : selected.items,
        `${selected.name}-${scene.exportKind}`,
        'xlsx'
      );
      updateScene({ modal: null, exporting: false, notice: 'exported' });
    } catch {
      setDownloadError(true);
    } finally {
      setDownloadBusy(false);
    }
  }
  const closeModal = () => {
    if (!downloadBusy) updateScene({ modal: null, exporting: false });
  };
  return (
    <section className="mx-auto max-w-[1180px] px-4 py-10 sm:px-8 sm:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-[34px]">
          {l.tour_title}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm sm:text-base">
          {l.tour_subtitle}
        </p>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground inline-flex items-center gap-2">
          <span
            className={cn(
              'size-1.5 rounded-full',
              playing ? 'bg-emerald-600' : 'bg-muted-foreground'
            )}
          />
          {playing
            ? l.auto_playing
            : manualScene
              ? l.manual_mode
              : l.paused_tour}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-8 gap-1.5 rounded-lg px-3 text-xs"
            disabled={downloadBusy}
            onClick={() =>
              playing ? stop() : manualScene ? restart() : setPlaying(true)
            }
          >
            {playing ? (
              <Pause className="size-3" />
            ) : (
              <Play className="size-3" />
            )}
            {playing ? l.pause_tour : l.play_tour}
          </Button>
          <Button
            variant="outline"
            className="h-8 gap-1.5 rounded-lg px-3 text-xs"
            disabled={downloadBusy}
            onClick={() => restart(0, false)}
          >
            <RotateCcw className="size-3" />
            {l.reset_tour}
          </Button>
          <Button
            variant="outline"
            className="h-8 gap-1.5 rounded-lg px-3 text-xs"
            disabled={downloadBusy}
            onClick={() => {
              updateScene({
                ...tourSceneAt(0),
                collections: [
                  createTourCollection('old'),
                  createTourCollection('new'),
                ],
              });
            }}
          >
            <MousePointer2 className="size-3" />
            {l.try_yourself}
          </Button>
        </div>
      </div>
      <div
        ref={windowRef}
        data-testid="product-tour"
        className="border-border bg-card relative isolate h-[750px] overflow-hidden rounded-xl border shadow-[0_20px_50px_-20px_rgba(26,33,60,0.28)] [--primary-foreground:#fff] [--primary:#1a213c] dark:[--primary-foreground:#1a213c] dark:[--primary:#dce1f5]"
        onPointerDownCapture={stop}
        onKeyDownCapture={(e) => {
          if (e.key !== 'Shift') stop();
          if (e.key === 'Escape') closeModal();
        }}
      >
        <div
          ref={scrollRef}
          data-tour-scroller
          inert={!!scene.modal}
          className="h-full overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          {selected ? (
            <TourCollectionDetail
              labels={l}
              collection={selected}
              tab={scene.tab}
              sort={scene.sort}
              page={scene.page}
              search={scene.search}
              onTabChange={(tab) => updateScene({ tab, page: 1, search: '' })}
              onSortChange={(sort) => updateScene({ sort, page: 1 })}
              onPageChange={(page) => updateScene({ page })}
              onSearchChange={(search) => updateScene({ search, page: 1 })}
              onBack={() => updateScene({ selectedId: null, notice: null })}
              onExport={() =>
                updateScene({
                  modal: 'export',
                  exportKind: 'latest',
                  exporting: false,
                })
              }
            />
          ) : (
            <TourCollectionList
              labels={l}
              collections={scene.collections}
              limit={15}
              onAdd={() =>
                updateScene({
                  modal: 'create',
                  draft: blankTourDraft(),
                  editingId: null,
                })
              }
              onView={openCollection}
              onUpdate={editCollection}
              onDelete={(id) => updateScene({ modal: 'delete', editingId: id })}
              onToggle={(id) =>
                updateScene((s) => ({
                  ...s,
                  collections: s.collections.map((c) =>
                    c.id === id ? { ...c, enabled: !c.enabled } : c
                  ),
                }))
              }
            />
          )}
        </div>
        {scene.notice && (
          <div
            role="status"
            className="absolute top-4 right-4 z-30 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-lg border border-emerald-700/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg"
          >
            <Check className="size-4 shrink-0" />
            {scene.notice === 'created'
              ? l.created_notice
              : scene.notice === 'preview-exported'
                ? l.export_demo_done
                : l.export_downloaded}
            <button
              aria-label={l.close}
              className="ml-2 rounded p-1"
              onClick={() => updateScene({ notice: null })}
            >
              <X className="size-3" />
            </button>
          </div>
        )}
        {scene.modal && (
          <div
            data-tour-scroller
            className="absolute inset-0 z-20 overflow-y-auto overscroll-contain bg-black/75 px-4 py-8 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div
              ref={modalRef}
              role="dialog"
              aria-labelledby="tour-dialog-title"
              tabIndex={-1}
              className="bg-card text-card-foreground mx-auto w-full max-w-[500px] overflow-hidden rounded-xl shadow-2xl outline-none"
            >
              <header className="border-border flex items-center justify-between gap-3 border-b p-5">
                <h2 id="tour-dialog-title" className="text-xl font-semibold">
                  {scene.modal === 'create'
                    ? l.add_collection
                    : scene.modal === 'update'
                      ? l.update_collection
                      : scene.modal === 'delete'
                        ? l.delete_collection
                        : l.export_data}
                </h2>
                <button
                  aria-label={l.close}
                  className="text-muted-foreground hover:text-foreground rounded p-1 focus-visible:outline-2"
                  onClick={closeModal}
                  disabled={downloadBusy}
                >
                  <X className="size-4" />
                </button>
              </header>
              {(scene.modal === 'create' || scene.modal === 'update') && (
                <TourCollectionForm
                  labels={l}
                  values={draft}
                  editing={scene.modal === 'update'}
                  onCancel={closeModal}
                  onSave={(values) => {
                    updateScene((s) => ({
                      ...s,
                      modal: null,
                      notice: 'created',
                      collections:
                        s.modal === 'update'
                          ? s.collections.map((c) =>
                              c.id === s.editingId
                                ? {
                                    ...c,
                                    ...values,
                                    source: values.source as
                                      | 'playlist'
                                      | 'channel',
                                  }
                                : c
                            )
                          : [
                              ...s.collections,
                              createTourCollection('new', {
                                ...values,
                                source: values.source as 'playlist' | 'channel',
                                id: crypto.randomUUID(),
                                name:
                                  values.name.trim() || l.new_collection_name,
                              }),
                            ],
                    }));
                  }}
                />
              )}
              {scene.modal === 'delete' && (
                <div className="space-y-5 p-5">
                  <p className="text-muted-foreground text-sm">
                    {l.delete_demo_note}
                  </p>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={closeModal}>
                      {l.cancel}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        updateScene((s) => ({
                          ...s,
                          modal: null,
                          selectedId:
                            s.selectedId === s.editingId ? null : s.selectedId,
                          collections: s.collections.filter(
                            (c) => c.id !== s.editingId
                          ),
                        }))
                      }
                    >
                      {l.delete}
                    </Button>
                  </div>
                </div>
              )}
              {scene.modal === 'export' &&
                (scene.exporting || downloadBusy ? (
                  <div
                    className="space-y-4 px-5 py-16 text-center"
                    role="status"
                  >
                    <LoaderCircle className="text-primary mx-auto size-9 animate-spin motion-reduce:animate-none" />
                    <p>{l.preparing_export}</p>
                    <p className="text-muted-foreground text-xs">
                      {downloadBusy ? l.sample_export_note : l.auto_export_note}
                    </p>
                    {!playing && !downloadBusy && (
                      <Button
                        variant="outline"
                        onClick={() => updateScene({ exporting: false })}
                      >
                        {l.back_to_export}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5 p-5">
                    <p className="text-muted-foreground text-sm">
                      {l.export_description}
                    </p>
                    {(['latest', 'missing'] as const).map((kind) => (
                      <label
                        key={kind}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-lg border p-4',
                          scene.exportKind === kind
                            ? 'border-primary bg-secondary/50'
                            : 'border-border',
                          kind === 'missing' &&
                            !selected?.missing.length &&
                            'opacity-50'
                        )}
                        data-tour={`export-${kind}`}
                      >
                        <input
                          className="accent-primary size-4"
                          type="radio"
                          name="tour-export"
                          checked={scene.exportKind === kind}
                          disabled={
                            kind === 'missing' && !selected?.missing.length
                          }
                          onChange={() => updateScene({ exportKind: kind })}
                        />
                        <span>
                          <span className="block text-sm font-medium">
                            {kind === 'latest'
                              ? l.export_latest
                              : l.export_missing}
                          </span>
                          <span className="text-muted-foreground mt-1 block text-xs">
                            {kind === 'latest'
                              ? selected?.items.length
                              : selected?.missing.length}{' '}
                            {l.items_available}
                          </span>
                        </span>
                      </label>
                    ))}
                    <p className="text-muted-foreground text-xs leading-5">
                      {l.sample_export_note}
                    </p>
                    {downloadError && (
                      <p className="text-destructive text-sm" role="alert">
                        {l.export_error}
                      </p>
                    )}
                    <div className="flex justify-end gap-3 border-t pt-5">
                      <Button variant="outline" onClick={closeModal}>
                        {l.cancel}
                      </Button>
                      <Button
                        className="gap-2"
                        data-tour="export-confirm"
                        onClick={() => void exportSample()}
                      >
                        <Download className="size-4" />
                        {l.export_excel}
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
        {cursor.visible && playing && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-40 transition-transform duration-500 ease-out motion-reduce:hidden"
            style={{ transform: `translate(${cursor.x}px,${cursor.y}px)` }}
          >
            <MousePointer2
              className={cn(
                'size-7 fill-[#1a213c] stroke-white drop-shadow-md transition-transform',
                cursor.clicking && 'scale-75'
              )}
            />
            {cursor.clicking && (
              <span className="border-primary/60 absolute -top-2 -left-2 size-8 animate-ping rounded-full border-2" />
            )}
          </div>
        )}
      </div>
      <div
        className="mt-5 grid grid-cols-3 gap-1 sm:grid-cols-6"
        aria-label={l.tour_steps}
      >
        {chapterNames.map((name, i) => (
          <button
            key={name}
            disabled={downloadBusy}
            aria-current={
              !manualScene && instruction.step === i ? 'step' : undefined
            }
            className={cn(
              'hover:bg-secondary rounded-lg px-2 py-2.5 text-left text-xs transition-colors focus-visible:outline-2',
              !manualScene && instruction.step === i
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground'
            )}
            onClick={() => restart(TOUR_CHAPTERS[i], false)}
          >
            <span className="mb-1 block font-mono text-[10px] opacity-60">
              0{i + 1}
            </span>
            {name}
          </button>
        ))}
      </div>
      <p
        className="text-muted-foreground mt-4 min-h-10 text-center text-sm"
        aria-live="polite"
      >
        {manualScene ? l.manual_hint : chapterDescriptions[instruction.step]}
      </p>
      <div className="border-border mt-6 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
        <p className="text-muted-foreground flex max-w-xl items-start gap-2 text-xs leading-5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          {l.demo_disclaimer}
        </p>
        <Link
          href="/settings/collections"
          className={buttonVariants({
            className:
              'shrink-0 gap-2 bg-[#1a213c] text-white hover:bg-[#303b5c]',
          })}
        >
          {l.open_workspace}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
