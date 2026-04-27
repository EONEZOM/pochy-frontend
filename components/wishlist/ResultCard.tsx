import { X } from 'lucide-react'
import Image from 'next/image'

export default function ResultCard({
  item,
  onSelect,
  onDelete,
}: {
  item: any
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <div className="group relative">
      <div
        onClick={onSelect}
        className="relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 shadow-sm transition-all active:scale-95"
      >
        <Image
          src={item.official_image || item.image_url}
          alt={item.product_name || 'thumbnail'}
          fill
          className="object-cover"
        />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute top-1.5 right-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60"
        >
          <X size={12} />
        </button>
      </div>

      <div className="mt-2 cursor-pointer px-1" onClick={onSelect}>
        <div className="truncate text-[10px] text-zinc-400">
          {item.brand_name || '브랜드 미상'}
        </div>
        <div className="mt-0.5 truncate text-xs font-semibold text-zinc-800">
          {item.product_name || '제품명 미상'}
        </div>
      </div>
    </div>
  )
}
