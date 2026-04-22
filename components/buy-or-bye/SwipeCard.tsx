import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'

export default function SwipeCard({
  src,
  onSwipe,
  setBgX,
  isTop = false,
}: {
  src: string
  onSwipe: (dir: 'left' | 'right') => void
  setBgX: (val: number) => void
  isTop?: boolean
}) {
  const [isSwiping, setIsSwiping] = useState(false)

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-150, 0, 150], [-15, 0, 15])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])

  useMotionValueEvent(x, 'change', (latest) => {
    // 스와이프가 확정되어 날아가는 중이라면 배경 업데이트 중단
    if (isTop && !isSwiping) setBgX(latest)
  })

  return (
    <motion.div
      style={isTop ? { x, rotate, opacity } : { scale: 0.95, y: 10 }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (isTop) {
          if (info.offset.x < -100) {
            setIsSwiping(true)
            onSwipe('left')
          } else if (info.offset.x > 100) {
            setIsSwiping(true)
            onSwipe('right')
          } else {
            setBgX(0)
          }
        }
      }}
      initial={
        isTop ? { scale: 0.8, opacity: 0, y: 20 } : { scale: 0.9, opacity: 0.5 }
      }
      animate={
        isTop
          ? { scale: 1, opacity: 1, y: 0 }
          : { scale: 0.95, opacity: 1, y: 10 }
      }
      exit={{
        x: x.get() < 0 ? -800 : 800,
        opacity: 0,
        transition: { duration: 0.4, ease: 'easeIn' },
      }}
      className={`absolute inset-0 z-20 cursor-grab overflow-hidden rounded-2xl border-4 border-white shadow-2xl select-none active:cursor-grabbing ${!isTop ? 'brightness-50' : ''}`}
    >
      <Image
        src={src}
        alt="captureImage"
        fill
        unoptimized={src.startsWith('blob:')}
        className="pointer-events-none object-cover"
      />
    </motion.div>
  )
}
