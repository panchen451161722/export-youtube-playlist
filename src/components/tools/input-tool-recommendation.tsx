import { ArrowRight, Info } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import type { YouTubeInputAlternative } from '@/lib/youtube-input-alternative';

export type InputToolRecommendationContent = Record<
  YouTubeInputAlternative['kind'],
  {
    title: string;
    description: string;
    tools: { href: string; label: string }[];
  }
>;

export function InputToolRecommendation({
  alternative,
  content,
  id,
}: {
  alternative: YouTubeInputAlternative;
  content: InputToolRecommendationContent;
  id: string;
}) {
  const copy = content[alternative.kind];
  return (
    <div
      id={id}
      role="status"
      className="border-border bg-muted/50 mt-3 rounded-xl border p-4 text-sm"
    >
      <div className="flex items-start gap-2">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">{copy.title}</p>
          <p className="text-muted-foreground mt-1 leading-6">
            {copy.description}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {copy.tools.map((tool) => (
          <Link
            key={tool.href}
            href={`${tool.href}?${new URLSearchParams({ input: alternative.input })}`}
            className="border-border bg-background hover:bg-accent focus-visible:ring-ring inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            {tool.label}
            <ArrowRight aria-hidden className="size-4 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
