'use client'

import { useState } from 'react'
import { Trash2, Check, AlertCircle, ChevronRight } from 'lucide-react'
import Image from 'next/image'

interface ReviewStepProps {
  results: any[]
  setResults: (results: any[]) => void
  onSave: () => void
  onCancel: () => void
}

const CATEGORIES = ['페이스', '아이', '립', '브로우', '스킨케어', '기타']

export default function RegisterReviewStep({
  results,
  setResults,
  onSave,
  onCancel,
}: ReviewStepProps) {
  // 1. 개별 항목 수정 핸들러
  const handleUpdate = (index: number, field: string, value: any) => {
    const updated = [...results]
    updated[index] = { ...updated[index], [field]: value }
    setResults(updated)
  }

  // 2. 항목 삭제 핸들러
  const handleDelete = (index: number) => {
    if (!confirm('이 항목을 삭제할까요?')) return
    setResults(results.filter((_, i) => i !== index))
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-zinc-900">결과 확인</h1>
          <p className="text-xs text-zinc-400">
            AI가 찾은 정보를 확인하고 수정해주세요.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-sm font-medium text-zinc-400 underline"
        >
          취소
        </button>
      </header>

      <main className="flex-1 space-y-4 p-5">
        {results.length === 0 ? (
          <div className="flex h-[50vh] flex-col items-center justify-center text-zinc-400">
            <AlertCircle size={40} strokeWidth={1.5} />
            <p className="mt-4">인식된 화장품이 없습니다.</p>
          </div>
        ) : (
          results.map((item, idx) => (
            <section
              key={idx}
              className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm"
            >
              <div className="flex gap-4">
                {/* 썸네일 */}
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                  <Image
                    src={item.image_url}
                    alt="analysis"
                    fill
                    className="object-cover"
                  />
                </div>

                {/* 입력 필드 */}
                <div className="flex-1 space-y-3">
                  {/* 브랜드 */}
                  <div>
                    <label className="text-[10px] font-bold text-indigo-500 uppercase">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={item.brand_name}
                      onChange={(e) =>
                        handleUpdate(idx, 'brand_name', e.target.value)
                      }
                      className="w-full border-b border-zinc-100 py-1 text-sm font-semibold focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* 제품명 */}
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">
                      Product
                    </label>
                    <input
                      type="text"
                      value={item.product_name}
                      onChange={(e) =>
                        handleUpdate(idx, 'product_name', e.target.value)
                      }
                      className="w-full border-b border-zinc-100 py-1 text-sm font-bold text-zinc-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 삭제 버튼 */}
                <button
                  onClick={() => handleDelete(idx)}
                  className="self-start p-1 text-zinc-300 hover:text-rose-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* 하단 분류 및 특징 */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-50 pt-4">
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase">
                    Category
                  </label>
                  <select
                    value={item.category}
                    onChange={(e) =>
                      handleUpdate(idx, 'category', e.target.value)
                    }
                    className="w-full rounded-lg bg-zinc-50 px-2 py-2 text-xs font-medium text-zinc-600 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase">
                    Confidence
                  </label>
                  <div className="flex h-8 items-center rounded-lg bg-emerald-50 px-2 text-[11px] font-bold text-emerald-500">
                    {Math.round(item.confidence_score * 100)}% Match
                  </div>
                </div>
              </div>
            </section>
          ))
        )}
      </main>

      {/* 하단 고정 저장 버튼 */}
      <footer className="fixed right-0 bottom-0 left-0 border-t border-zinc-100 bg-white p-5">
        <button
          onClick={onSave}
          disabled={results.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-4 font-bold text-white transition-transform active:scale-[0.98] disabled:bg-zinc-200"
        >
          <Check size={20} />
          {results.length}개의 위시템 등록하기
        </button>
      </footer>
    </div>
  )
}
