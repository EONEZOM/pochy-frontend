import { X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function ResultCard({
  item,
  onSelect,
  onDelete,
}: {
  item: any;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const imageSrc = String(item.official_image ?? item.image_url ?? '').trim();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[130px] shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-mono-dark-gray hover:text-mono-jet absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-colors"
        aria-label="항목 삭제"
      >
        <X className="size-3.5 stroke-[1.5]" />
      </button>

      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'relative h-full w-full overflow-hidden rounded-lg bg-[#F3F3F3]',
          'shadow-[1px_1px_1px_0_rgba(0,0,0,0.25)] transition-transform active:scale-[0.98]',
        )}
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={String(item.product_name ?? '제품')}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="block h-full w-full bg-[#EAEAEA]" aria-hidden />
        )}
      </button>
    </div>
  );
}
