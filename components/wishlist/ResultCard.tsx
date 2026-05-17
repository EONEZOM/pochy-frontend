import { X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/resolve-media-url';

const CHECKERBOARD_STYLE = {
  backgroundImage:
    'linear-gradient(45deg, #f5f5f5 25%, transparent 25%, transparent 75%, #f5f5f5 75%), linear-gradient(45deg, #f5f5f5 25%, transparent 25%, transparent 75%, #f5f5f5 75%)',
  backgroundSize: '12px 12px',
  backgroundPosition: '0 0, 6px 6px',
} as const;

export default function ResultCard({
  item,
  onSelect,
  onDelete,
  imageObjectFit = 'cover',
}: {
  item: Record<string, unknown>;
  onSelect: () => void;
  onDelete: () => void;
  /** cover: 위시 캡처 사진용 / contain: 누끼·투명 배경 제품용 */
  imageObjectFit?: 'cover' | 'contain';
}) {
  const imageSrc = resolveMediaUrl(
    String(item.official_image ?? item.image_url ?? '').trim(),
  );
  const isContain = imageObjectFit === 'contain';

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
        style={isContain ? CHECKERBOARD_STYLE : undefined}
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={String(item.product_name ?? '제품')}
            fill
            className={cn(isContain ? 'object-contain p-2' : 'object-cover')}
          />
        ) : (
          <span className="block h-full w-full bg-[#EAEAEA]" aria-hidden />
        )}
      </button>
    </div>
  );
}
