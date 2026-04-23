import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistStore {
  items: any[]
  addItem: (item: any) => void
  removeItem: (id: number) => void
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (newItem) =>
        set((state) => ({ items: [newItem, ...state.items] })),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
    }),
    { name: 'wishlist-storage' }, // 로컬 스토리지 키
  ),
)
