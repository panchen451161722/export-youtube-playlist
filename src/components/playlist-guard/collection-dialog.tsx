import type { ReactNode } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';

export function CollectionDialog({
  title,
  description,
  closeLabel,
  busy,
  onClose,
  footer,
  children,
}: {
  title: string;
  description: string;
  closeLabel: string;
  busy: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/65" />
        <DialogPrimitive.Popup
          data-slot="collection-dialog"
          className="bg-popover text-popover-foreground ring-foreground/10 fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl shadow-2xl ring-1 outline-none"
        >
          <DialogHeader className="border-border shrink-0 border-b px-5 py-6 pr-16 sm:px-7 sm:pr-16">
            <DialogTitle className="text-xl leading-7 font-semibold sm:text-2xl">
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {description}
            </DialogDescription>
          </DialogHeader>
          <DialogClose
            disabled={busy}
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-5 right-4"
              />
            }
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">{closeLabel}</span>
          </DialogClose>
          <div className="min-h-0 overflow-y-auto p-5 sm:p-7">{children}</div>
          {footer && (
            <div className="border-border shrink-0 border-t px-5 py-4 sm:px-7">
              {footer}
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
