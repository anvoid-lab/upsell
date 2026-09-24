import { IconFileText } from '@icons';
import type { Message } from '../../../../core/contracts';
import { cn } from '@/lib/utils';

export function MessageAttachments({
  attachments,
}: {
  attachments: Message['attachment'];
}) {
  return (
    <div
      className={cn(
        'grid gap-1.5 overflow-hidden rounded-xl',
        attachments.length > 1 && 'grid-cols-2',
      )}
    >
      {attachments.map((attachment, index) => {
        const url = attachment.media_url;
        const key = attachment.external_id ?? url ?? index;
        if (!url || attachment.unavailable) {
          return (
            <div
              key={key}
              className="flex min-h-20 items-center justify-center rounded-lg bg-black/5 px-3 text-xs opacity-70"
            >
              Media unavailable
            </div>
          );
        }
        if (attachment.type === 'video') {
          return (
            <video
              key={key}
              src={url}
              controls
              playsInline
              preload="metadata"
              className="max-h-72 w-full rounded-lg object-cover"
            />
          );
        }
        if (attachment.type === 'image' || attachment.type === 'sticker') {
          return (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block min-h-32 min-w-48 overflow-hidden rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={attachment.filename ?? 'Message attachment'}
                className="h-full min-h-32 w-full object-cover"
              />
            </a>
          );
        }
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-16 items-center gap-2 rounded-lg bg-black/5 px-3 text-xs underline underline-offset-2"
          >
            <IconFileText className="h-4 w-4" />
            {attachment.filename ?? 'Open attachment'}
          </a>
        );
      })}
    </div>
  );
}
