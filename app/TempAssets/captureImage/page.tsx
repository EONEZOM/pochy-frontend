"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function CaptureImagePage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [pipelineStep, setPipelineStep] = useState("")
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
  }

  const processImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setResult(null)
    setLogs([])
    addLog("🚀 캡처 이미지 직접 분석 시작 (No-Nukki 모드)")

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string

      try {
        setPipelineStep("🤖 GPT가 제품을 식별하고 있습니다...")
        addLog("GPT Vision API 호출 중...")

        // /api/captureVision 으로 요청
        const res = await fetch("/api/captureVision", {
          method: "POST",
          body: JSON.stringify({ images: [base64] }),
          headers: { "Content-Type": "application/json" },
        })
        const data = await res.json()

        if (!data.results || data.results.length === 0) {
          throw new Error("분석 결과를 받지 못했습니다.")
        }

        const productInfo = data.results[0]
        addLog(
          `✅ 식별 완료: ${productInfo.brand} - ${productInfo.product_name}`,
        )

        // [수정] 누끼 작업 없이 즉시 결과 셋팅 (원본 이미지 base64 사용)
        setResult({
          ...productInfo,
          src: base64, // 배경 제거 없이 원본을 그대로 보여줌
        })

        addLog("✨ 데이터 매칭 완료!")
      } catch (err: any) {
        addLog(`❌ 에러: ${err.message}`)
      } finally {
        setLoading(false)
        setPipelineStep("")
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center border-b border-zinc-900 pb-8">
          <h1 className="text-4xl font-black text-green-500 tracking-tighter mb-2 italic">
            POUCHY
          </h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
            Direct Scan Test Mode
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <div className="relative">
              <label className="flex flex-col items-center justify-center w-full h-96 border-2 border-dashed border-zinc-800 rounded-[40px] bg-zinc-900/30 hover:bg-zinc-900 hover:border-green-500/50 transition-all cursor-pointer overflow-hidden group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-2xl">📸</span>
                  </div>
                  <p className="mb-2 text-sm text-zinc-400 font-bold">
                    이미지 업로드
                  </p>
                  <p className="text-[10px] text-zinc-600 uppercase font-black italic">
                    Wait for GPT Response
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={processImage}
                  accept="image/*"
                />
              </label>

              {loading && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center rounded-[40px] z-20">
                  <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-xs font-black text-green-500 tracking-tighter animate-pulse">
                    {pipelineStep}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-black/80 p-5 rounded-3xl border border-zinc-900 h-40 overflow-y-auto font-mono text-[10px] text-zinc-500 shadow-inner">
              {logs.map((log, i) => (
                <div key={i} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <AnimatePresence>
              {result ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full bg-zinc-900 p-8 rounded-[50px] border border-zinc-800 shadow-2xl relative">
                  <div className="aspect-square bg-black rounded-[40px] mb-8 flex items-center justify-center p-6 overflow-hidden">
                    <img
                      src={result.src}
                      className="max-h-full max-w-full object-contain rounded-2xl"
                      alt="result"
                    />
                  </div>
                  <div className="space-y-4 px-2">
                    <div>
                      <p className="text-green-500 font-black text-[10px] uppercase tracking-[0.2em] mb-2">
                        {result.brand || "UNKNOWN"}
                      </p>
                      <h2 className="text-3xl font-black leading-none tracking-tighter mb-4">
                        {result.product_name || "분석 실패"}
                      </h2>
                      <p className="text-zinc-500 text-xs font-bold uppercase">
                        {result.product_type}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {result.key_features?.map((f: string, i: number) => (
                        <span
                          key={i}
                          className="bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-xl text-[10px] font-black italic">
                          #{f.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="w-full h-full min-h-[450px] border-2 border-zinc-900 rounded-[50px] flex items-center justify-center text-zinc-800 font-black text-sm tracking-widest italic uppercase">
                  Ready to Analysis
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
