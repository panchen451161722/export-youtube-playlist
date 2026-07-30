import { zipSync } from 'fflate';

import { generateYouTubeExportFiles } from './formats';
import { safeExportFileName } from './records';
import type {
  YouTubeExportContext,
  YouTubeExportFormat,
  YouTubeExportRecord,
} from './types';

export function downloadExportBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }, 1_000);
}

export function triggerExportConfetti() {
  if (
    typeof window === 'undefined' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  const colors = ['#ff4d3d', '#ffd166', '#06d6a0', '#4d7cff', '#b56cff'];
  for (let index = 0; index < 80; index += 1) {
    const piece = document.createElement('span');
    const size = 5 + Math.random() * 7;
    piece.setAttribute('aria-hidden', 'true');
    piece.dataset.exportConfetti = '';
    Object.assign(piece.style, {
      position: 'fixed',
      zIndex: '9999',
      top: '-16px',
      left: `${Math.random() * 100}vw`,
      width: `${size}px`,
      height: `${size * (0.55 + Math.random() * 0.8)}px`,
      borderRadius: Math.random() > 0.7 ? '50%' : '2px',
      background: colors[index % colors.length],
      pointerEvents: 'none',
    });
    document.body.appendChild(piece);
    const drift = (Math.random() - 0.5) * 240;
    const duration = 1_600 + Math.random() * 1_600;
    piece
      .animate(
        [
          { transform: 'translate3d(0, 0, 0) rotate(0deg)', opacity: 1 },
          {
            transform: `translate3d(${drift}px, 105vh, 0) rotate(${
              540 + Math.random() * 720
            }deg)`,
            opacity: 0.9,
          },
        ],
        {
          duration,
          delay: Math.random() * 320,
          easing: 'cubic-bezier(.18,.75,.35,1)',
          fill: 'forwards',
        }
      )
      .finished.finally(() => piece.remove());
  }
}

export async function downloadYouTubeExports(params: {
  records: YouTubeExportRecord[];
  context: YouTubeExportContext;
  formats: YouTubeExportFormat[];
}) {
  const files = await generateYouTubeExportFiles(params);
  if (files.length === 1) {
    const [file] = files;
    downloadExportBlob(
      new Blob([new Uint8Array(file.bytes)], { type: file.mimeType }),
      file.fileName
    );
    return files;
  }

  const archive = zipSync(
    Object.fromEntries(files.map((file) => [file.fileName, file.bytes])),
    { level: 6 }
  );
  const baseName = safeExportFileName(
    params.context.title,
    params.context.source === 'channel' ? 'youtube-channel' : 'youtube-playlist'
  );
  downloadExportBlob(
    new Blob([new Uint8Array(archive)], { type: 'application/zip' }),
    `${baseName}-exports.zip`
  );
  return files;
}
