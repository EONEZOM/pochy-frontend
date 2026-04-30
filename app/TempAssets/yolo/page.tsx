"use client"

import { useState, useRef } from "react"
// @ts-expect-error: onnxruntime-web 타입 정의 이슈 해결 전까지 무시
import * as ort from "onnxruntime-web"

const DETECT_THRESHOLD = 0.1 // 사용자 설정 유지
ort.env.wasm.wasmPaths =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/"

export default function PouchyYoloPipeline() {
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

  const preprocess = async (img: HTMLImageElement): Promise<ort.Tensor> => {
    const canvas = document.createElement("canvas")
    canvas.width = 640
    canvas.height = 640
    const ctx = canvas.getContext("2d")
    ctx?.drawImage(img, 0, 0, 640, 640)
    const { data } = ctx?.getImageData(0, 0, 640, 640)!
    const float32Data = new Float32Array(3 * 640 * 640)
    for (let i = 0; i < 640 * 640; i++) {
      float32Data[i] = data[i * 4] / 255.0
      float32Data[i + 640 * 640] = data[i * 4 + 1] / 255.0
      float32Data[i + 2 * 640 * 640] = data[i * 4 + 2] / 255.0
    }
    return new ort.Tensor("float32", float32Data, [1, 3, 640, 640])
  }

  const processPipeline = async (base64: string) => {
    setLoading(true)
    setCroppedImages([])
    setLogs([])
    addLog("🚀 POUCHY YOLO 파이프라인 가동")

    try {
      addLog("🔍 1단계: YOLO26 엔진 로드 및 객체 탐지...")
      const session = await ort.InferenceSession.create(
        "/models/yolo26n.onnx",
        {
          executionProviders: ["wasm"],
        },
      )
      const img = await loadImage(base64)
      const input = await preprocess(img)
      const outputs = await session.run({ images: input })
      const output = outputs[session.outputNames[0]].data as Float32Array

      // 디버그 캔버스 그리기
      const mainCanvas = debugCanvasRef.current!
      mainCanvas.width = img.naturalWidth
      mainCanvas.height = img.naturalHeight
      const mctx = mainCanvas.getContext("2d")!
      mctx.drawImage(img, 0, 0)

      const boxes = []
      for (let i = 0; i < 300; i++) {
        const offset = i * 6
        const score = output[offset + 4]
        if (score > DETECT_THRESHOLD) {
          const rawX1 = output[offset]
          const rawY1 = output[offset + 1]
          const rawX2 = output[offset + 2]
          const rawY2 = output[offset + 3]
          const x1 = (rawX1 > 1.1 ? rawX1 / 640 : rawX1) * img.naturalWidth
          const y1 = (rawY1 > 1.1 ? rawY1 / 640 : rawY1) * img.naturalHeight
          const x2 = (rawX2 > 1.1 ? rawX2 / 640 : rawX2) * img.naturalWidth
          const y2 = (rawY2 > 1.1 ? rawY2 / 640 : rawY2) * img.naturalHeight

          boxes.push({ x1, y1, x2, y2, score })
          mctx.strokeStyle = "#00ff00"
          mctx.lineWidth = 4
          mctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
        }
      }

      addLog(`✂️ 2단계: 정밀 크롭 중 (${boxes.length}개)...`)
      const crops = boxes.map((box) => {
        const canvas = document.createElement("canvas")
        const w = box.x2 - box.x1
        const h = box.y2 - box.y1
        canvas.width = w
        canvas.height = h
        canvas
          .getContext("2d")
          ?.drawImage(img, box.x1, box.y1, w, h, 0, 0, w, h)
        return canvas.toDataURL("image/jpeg", 0.9)
      })

      addLog("🤖 3단계: GPT Vision 분석 요청...")
      const res = await fetch("/api/vision", {
        method: "POST",
        body: JSON.stringify({ images: crops }),
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      console.log("GPT 응답 데이터:", data)

      setStats({
        time: data.duration || "0",
        tokens: data.usage?.total_tokens || 0,
      })

      if (data.results && Array.isArray(data.results)) {
        addLog("✨ 4단계: 화장품 필터링 및 배경 제거(Nukki) 시작...")
        const { removeBackground } = await import("@imgly/background-removal")

        for (let i = 0; i < data.results.length; i++) {
          const item = data.results[i]

          // 사용자가 요청한 대로 is_cosmetic: true 인 것만 처리
          if (item.is_cosmetic) {
            addLog(`🧪 [#${i + 1}] ${item.product_name} 누끼 작업 중...`)

            try {
              // 해당 크롭 이미지 배경 제거
              const nukkiBlob = await removeBackground(crops[i], {
                model: "isnet_quint8", // 가벼운 모델 사용
              })
              // const nukkiBlob = await removeBackground(crops[i], {
              //   model: "isnet", // 가벼운 모델 사용
              // })
              const nukkiUrl = URL.createObjectURL(nukkiBlob)

              setCroppedImages((prev) => [
                ...prev,
                {
                  ...item,
                  src: nukkiUrl, // 배경 제거된 이미지 주소
                  id: i,
                },
              ])
            } catch (err) {
              addLog(`⚠️ [#${i + 1}] 누끼 작업 실패, 원본 사용`)
              setCroppedImages((prev) => [
                ...prev,
                { ...item, src: crops[i], id: i },
              ])
            }
          } else {
            addLog(`🚫 [#${i + 1}] 화장품 아님 (스킵)`)
          }
        }
      }
      addLog("✅ 모든 작업 완료!")
    } catch (err: any) {
      addLog(`❌ 에러: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-zinc-950 text-white min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-black text-green-500 tracking-tight">
          POUCHY DEBUG CONSOLE (YOLO26)
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
          className="text-sm bg-zinc-900 p-2 rounded-lg border border-zinc-800"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Canvas & Logs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
            <div className="px-4 py-2 bg-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Detection Map
            </div>
            <canvas ref={debugCanvasRef} className="w-full h-auto" />
          </div>
          <div className="bg-black p-4 rounded-xl border border-zinc-800 h-48 overflow-y-auto text-[11px] font-mono">
            <div className="text-zinc-500 mb-2 border-b border-zinc-900 pb-1">
              TIME: {stats.time}s | TOKENS: {stats.tokens}
            </div>
            {logs.map((log, i) => (
              <div key={i} className="mb-1 text-zinc-400">
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Clean Results (Cosmetic Only) */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-4">
          {croppedImages.map((img) => (
            <div
              key={img.id}
              className="bg-zinc-900 p-4 rounded-3xl border border-green-500/20 shadow-lg transition-all hover:border-green-500/50">
              <div className="h-40 bg-zinc-800/50 rounded-2xl mb-4 overflow-hidden flex items-center justify-center relative">
                <img
                  src={img.src}
                  className="max-h-full max-w-full object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]"
                />
                <div className="absolute top-3 left-3 bg-green-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded">
                  {Math.round(img.confidence_score * 100)}% MATCH
                </div>
              </div>
              <div className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
                {img.brand}
              </div>
              <h3 className="text-sm font-bold truncate text-white">
                {img.product_name}
              </h3>
              <div className="mt-2 flex gap-1 flex-wrap">
                {img.key_features?.slice(0, 2).map((f: string, idx: number) => (
                  <span
                    key={idx}
                    className="bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded text-[8px]">
                    #{f}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {croppedImages.length === 0 && !loading && (
            <div className="col-span-2 h-64 border-2 border-dashed border-zinc-800 rounded-3xl flex items-center justify-center text-zinc-600">
              화장품으로 분석된 결과만 여기에 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
