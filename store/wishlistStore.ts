import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import MOCK_DATA from '@/app/mock/mockWishlistItems.json'

interface WishlistStore {
  items: any[]
  addItem: (item: any) => void
  removeItem: (id: number) => void
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set) => ({
      items: MOCK_DATA, // 초기값 설정
      addItem: (newItem) =>
        set((state) => ({ items: [newItem, ...state.items] })),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
    }),
    { name: 'wishlist-storage' }, // 로컬 스토리지 키
  ),
)
