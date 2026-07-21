import {
  Clock3,
  FileSpreadsheet,
  Link2,
  ListFilter,
  LockKeyhole,
  Rows3,
} from 'lucide-react';

import { m } from '@/paraglide/messages.js';

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold tracking-[0.16em] uppercase">
            {m['landing.features.eyebrow']()}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            {m['landing.features.title']()}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-xl text-base leading-7 sm:text-lg">
            {m['landing.features.description']()}
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="group border-border/70 bg-card relative overflow-hidden rounded-3xl border p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none sm:p-9 lg:row-span-2">
            <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-2xl shadow-sm">
              <Rows3 aria-hidden="true" className="size-6" />
            </div>
            <h3 className="mt-8 text-2xl font-semibold tracking-tight">
              {m['landing.features.metadata.title']()}
            </h3>
            <p className="text-muted-foreground mt-3 max-w-lg leading-7">
              {m['landing.features.metadata.description']()}
            </p>

            <div
              aria-hidden="true"
              className="border-border/70 bg-background mt-9 overflow-hidden rounded-2xl border"
            >
              <div className="bg-muted/60 grid grid-cols-[1.6fr_1fr_0.7fr] gap-3 border-b px-4 py-3">
                <span className="bg-muted-foreground/16 h-2.5 rounded-full" />
                <span className="bg-muted-foreground/12 h-2.5 rounded-full" />
                <span className="bg-muted-foreground/10 h-2.5 rounded-full" />
              </div>
              {[74, 60, 84, 68].map((width, index) => (
                <div
                  key={width}
                  className="grid grid-cols-[1.6fr_1fr_0.7fr] items-center gap-3 border-b px-4 py-3 last:border-b-0"
                >
                  <span
                    className="bg-foreground/10 h-2.5 rounded-full"
                    style={{ width: `${width}%` }}
                  />
                  <span className="bg-foreground/7 h-2.5 w-3/4 rounded-full" />
                  <span className="bg-primary/16 h-5 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </article>

          <article className="group border-border/70 bg-card rounded-3xl border p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none sm:p-9">
            <div className="flex items-start justify-between gap-6">
              <div>
                <FileSpreadsheet
                  aria-hidden="true"
                  className="text-primary size-9"
                  strokeWidth={1.7}
                />
                <h3 className="mt-7 text-2xl font-semibold tracking-tight">
                  {m['landing.features.spreadsheets.title']()}
                </h3>
              </div>
              <div className="flex -space-x-2">
                <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl border-2 border-white text-[10px] font-bold">
                  {m['landing.features.spreadsheets.csv']()}
                </span>
                <span className="flex size-10 items-center justify-center rounded-xl border-2 border-white bg-emerald-600 text-[10px] font-bold text-white">
                  {m['landing.features.spreadsheets.xlsx']()}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground mt-3 leading-7">
              {m['landing.features.spreadsheets.description']()}
            </p>
            <div className="text-muted-foreground mt-7 flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-2">
                <ListFilter aria-hidden="true" className="size-4" />
                {m['landing.features.spreadsheets.clean_columns']()}
              </span>
              <span className="inline-flex items-center gap-2">
                <Link2 aria-hidden="true" className="size-4" />
                {m['landing.features.spreadsheets.copy_links']()}
              </span>
            </div>
          </article>

          <article className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-7 text-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none sm:p-9">
            <div
              aria-hidden="true"
              className="absolute -top-20 -right-16 size-52 rounded-full bg-blue-500/20 blur-3xl"
            />
            <div className="relative">
              <div className="flex items-center gap-3">
                <LockKeyhole
                  aria-hidden="true"
                  className="size-8 text-blue-300"
                  strokeWidth={1.7}
                />
                <Clock3
                  aria-hidden="true"
                  className="size-5 text-slate-500"
                  strokeWidth={1.7}
                />
              </div>
              <h3 className="mt-7 text-2xl font-semibold tracking-tight">
                {m['landing.features.privacy.title']()}
              </h3>
              <p className="mt-3 leading-7 text-slate-300">
                {m['landing.features.privacy.description']()}
              </p>
              <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-200">
                <span className="size-2 rounded-full bg-emerald-400" />
                {m['landing.features.privacy.status']()}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
