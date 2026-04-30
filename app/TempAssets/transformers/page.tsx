"use client"

import { useState, useRef } from "react"

// 탐지 임계값 (Transformers용)
const DETECT_THRESHOLD = 0

export default function TransformersVisualDebug() {
  const [croppedImages, setCroppedImages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [stats, setStats] = useState({ time: "0", tokens: 0 })
  const debugCanvasRef = useRef<HTMLCanvasElement>(null)

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
    console.log(msg)
  }

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("이미지 로드 실패"))
      img.src = src
    })
  }

  const processPipeline = async (base64: string) => {
    setLoading(true)
    setCroppedImages([])
    setLogs([])
    addLog("🚀 파이프라인 시작 (Transformers OWL-ViT)")

    try {
      const { pipeline, env } = await import("@huggingface/transformers")

      // [핵심] Transformers 전용 환경 설정 초기화
      env.allowLocalModels = false
      env.useBrowserCache = true

      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.proxy = false
        env.backends.onnx.wasm.numThreads = 1

        // ❗ 이거 반드시 켜라
        env.backends.onnx.wasm.simd = true
      }

      addLog("🔍 1단계: OWL-ViT 모델 로딩 중... (약 150MB)")

      const detector = await pipeline(
        "zero-shot-object-detection",
        "Xenova/owlvit-base-patch32",
      )

      const img = await loadImage(base64)

      const candidate_labels = [
        "cosmetic bottle",
        "skincare tube",
        "cream jar",
        "cosmetic product",
      ]

      addLog("🧠 2단계: 온디바이스 객체 탐지 실행 중...")
      // const rawDetections = await detector(base64, {
      //   threshold: DETECT_THRESHOLD,
      //   percentage: true,
      // })
      const rawDetections = await detector(base64, {
        candidate_labels, // 이 텍스트들과 매칭되는 물체를 찾습니다.
        threshold: 0.1, // OWL-ViT는 점수가 낮게 측정되므로 0.1~0.15 권장
      })

      const mainCanvas = debugCanvasRef.current!
      mainCanvas.width = img.naturalWidth
      mainCanvas.height = img.naturalHeight
      const mctx = mainCanvas.getContext("2d")!
      mctx.drawImage(img, 0, 0)

      addLog(`🎯 객체 탐지 완료: ${rawDetections.length}개 발견`)

      const crops: string[] = []
      rawDetections.forEach((det: any) => {
        const { xmin, ymin, xmax, ymax } = det.box
        const x1 = xmin * img.naturalWidth
        const y1 = ymin * img.naturalHeight
        const x2 = xmax * img.naturalWidth
        const y2 = ymax * img.naturalHeight

        mctx.strokeStyle = "#00ff00"
        mctx.lineWidth = 6
        mctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
        mctx.fillStyle = "#00ff00"
        mctx.font = "bold 24px Arial"
        mctx.fillText(
          `${det.label} (${Math.round(det.score * 100)}%)`,
          x1,
          y1 - 10,
        )

        const cropCanvas = document.createElement("canvas")
        cropCanvas.width = x2 - x1
        cropCanvas.height = y2 - y1
        cropCanvas
          .getContext("2d")
          ?.drawImage(img, x1, y1, x2 - x1, y2 - y1, 0, 0, x2 - x1, y2 - y1)
        crops.push(cropCanvas.toDataURL("image/jpeg", 0.9))
      })

      if (crops.length === 0) {
        addLog("⚠️ 탐지된 객체가 없습니다.")
        return
      }

      // [수정] 백엔드 route.ts와 키값(images) 일치 확인
      addLog("🤖 3단계: GPT Vision 분석 요청 중...")
      const res = await fetch("/api/vision", {
        method: "POST",
        body: JSON.stringify({ images: crops }),
        headers: { "Content-Type": "application/json" },
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setStats({
        time: data.duration || "0",
        tokens: data.usage?.total_tokens || 0,
      })
      addLog(`📊 GPT 분석 완료 (토큰: ${data.usage?.total_tokens})`)

      // 4단계: 배경 제거 및 결과 표시 (필요 시 주석 해제)
      if (data.results) {
        setCroppedImages(
          data.results.map((item: any, i: number) => ({
            ...item,
            src: crops[i],
            id: i,
            is_cosmetic: item.is_cosmetic,
          })),
        )
      }
      addLog("✅ 모든 작업 완료!")
    } catch (err: any) {
      // [디버그] 에러 발생 시 상세 정보 출력
      console.error(err)
      addLog(`❌ 에러: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-zinc-950 text-white min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-black text-green-500 uppercase tracking-tighter">
          CO-DUCK DEBUG (Transformers Version)
        </h1>
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              const reader = new FileReader()
              reader.onload = (ev) =>
                processPipeline(ev.target?.result as string)
              reader.readAsDataURL(file)
            }
          }}
          className="text-xs bg-zinc-900 p-2 rounded-lg border border-zinc-800"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
            <div className="px-4 py-2 bg-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Transformers Detection Map
            </div>
            <canvas ref={debugCanvasRef} className="w-full h-auto" />
          </div>

          <div className="bg-black p-5 rounded-2xl border border-zinc-800 h-48 overflow-y-auto font-mono text-[11px]">
            <div className="flex justify-between text-zinc-500 mb-3 pb-2 border-b border-zinc-900">
              <span>STATUS: {loading ? "ANALYZING..." : "IDLE"}</span>
              <span>TOKENS: {stats.tokens}</span>
            </div>
            {logs.map((log, i) => (
              <div
                key={i}
                className={`mb-1 ${log.includes("❌") ? "text-red-500" : "text-zinc-400"}`}>
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4 align-start">
          {croppedImages.map((img) => (
            <div
              key={img.id}
              className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 transition-all">
              <div className="h-40 bg-black rounded-xl mb-4 overflow-hidden flex items-center justify-center relative">
                <img
                  src={img.src}
                  className="max-h-full object-contain"
                  alt="product"
                />
              </div>
              <div className="text-[10px] text-green-500 font-bold uppercase">
                {img.brand || "알 수 없음"}
              </div>
              <h3 className="text-sm font-bold truncate leading-tight mb-2">
                {img.product_name}
              </h3>
              <div
                className={`mt-2 inline-block px-2 py-0.5 rounded text-[9px] font-black ${img.is_cosmetic ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`}>
                {img.is_cosmetic ? "COSMETIC" : "OTHERS"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
