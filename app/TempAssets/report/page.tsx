"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

// 브라우저 환경 process 에러 방지용 심
if (typeof window !== "undefined") {
  // @ts-ignore
  window.process = window.process || {}
  // @ts-ignore
  window.process.env = window.process.env || {}
}

export default function VisionBatchProfilingPipeline() {
  const [result, setResult] = useState<any[] | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [croppedImages, setCroppedImages] = useState<
    { label: string; src: string }[]
  >([])
  const [status, setStatus] = useState("준비됨")
  const [loading, setLoading] = useState(false)

  const imgRef = useRef<HTMLImageElement>(null)

  const processWithBatchFilter = async (detections: any[]) => {
    const image = imgRef.current
    if (!image) return

    const { removeBackground } = await import("@imgly/background-removal")

    console.group("🚀 AI 파이프라인 정밀 분석 (Batch 모드)")
    const pipelineStart = performance.now()

    // --- [STEP 1] 전체 개체 크롭 ---
    const cropStart = performance.now()
    setStatus("모든 이미지 조각 추출 중...")

    const allCrops = detections.map((item) => {
      const { xmin, ymin, xmax, ymax } = item.box
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      const width = Math.floor((xmax - xmin) * image.naturalWidth)
      const height = Math.floor((ymax - ymin) * image.naturalHeight)
      canvas.width = width
      canvas.height = height
      if (ctx)
        ctx.drawImage(
          image,
          xmin * image.naturalWidth,
          ymin * image.naturalHeight,
          width,
          height,
          0,
          0,
          width,
          height,
        )
      return canvas.toDataURL("image/png")
    })
    const cropEnd = performance.now()
    console.log(
      `[Step 1] 크롭 완료 (${allCrops.length}개): ${((cropEnd - cropStart) / 1000).toFixed(2)}초`,
    )

    try {
      // --- [STEP 2] GPT-4o-mini Batch 분석 ---
      const gptStart = performance.now()
      setStatus(`GPT 배치 분석 중... (토큰 최적화 호출)`)

      const batchRes = await fetch("/api/vision", {
        method: "POST",
        body: JSON.stringify({ images: allCrops }),
        headers: { "Content-Type": "application/json" },
      })
      const { results } = await batchRes.json()
      const gptEnd = performance.now()

      console.log(
        `[Step 2] GPT Batch 분석 완료: ${((gptEnd - gptStart) / 1000).toFixed(2)}초`,
      )
      console.table(results) // 분석 결과를 표 형태로 출력

      const finalResults = []
      let nukkiCount = 1

      // --- [STEP 3] 화장품 선별 누끼 작업 ---
      const nukkiTotalStart = performance.now()

      for (let i = 0; i < results.length; i++) {
        const analysis = results[i]
        const cropSrc = allCrops[i]

        if (analysis.isCosmetic) {
          const itemStart = performance.now()
          setStatus(`'${analysis.productName}' 누끼 작업 중... (${nukkiCount})`)

          const blob = await removeBackground(cropSrc, { model: "small" })

          const finalBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })

          const itemEnd = performance.now()
          console.log(
            `   └ [누끼 #${nukkiCount}] ${analysis.productName}: ${((itemEnd - itemStart) / 1000).toFixed(2)}초`,
          )

          finalResults.push({
            label: analysis.productName || "알 수 없는 제품",
            src: finalBase64,
          })

          setCroppedImages([...finalResults])
          nukkiCount++
        }
      }
      const nukkiTotalEnd = performance.now()
      console.log(
        `[Step 3] 전체 누끼 작업 완료: ${((nukkiTotalEnd - nukkiTotalStart) / 1000).toFixed(2)}초`,
      )
    } catch (err) {
      console.error("Critical Pipeline Failure:", err)
    }

    const pipelineEnd = performance.now()
    const totalTime = ((pipelineEnd - pipelineStart) / 1000).toFixed(2)
    console.log(
      `%c[종합] 총 소요 시간: ${totalTime}초`,
      "color: #00ff00; font-weight: bold; font-size: 14px;",
    )
    console.groupEnd()

    setStatus(`분석 완료! (총 ${totalTime}초 소요)`)
  }

  const detectAndProcess = async (base64Image: string) => {
    setLoading(true)
    const initStart = performance.now()
    setStatus("AI 엔진 초기화 중...")

    try {
      const { pipeline } = await import("@huggingface/transformers")

      const modelStart = performance.now()
      const detector = await pipeline(
        "object-detection",
        "Xenova/detr-resnet-50",
      )
      const modelEnd = performance.now()
      console.log(
        `[준비] 탐색 모델 로드: ${((modelEnd - modelStart) / 1000).toFixed(2)}초`,
      )

      const detectStart = performance.now()
      const output = await detector(base64Image, {
        threshold: 0.5,
        percentage: true,
      })
      const detectEnd = performance.now()
      console.log(
        `[분석] 이미지 스캔 완료: ${((detectEnd - detectStart) / 1000).toFixed(2)}초`,
      )

      setResult(output)
      await processWithBatchFilter(output)
    } catch (error: any) {
      console.error("Detection Error:", error)
      setStatus(`에러: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setImageSrc(base64)
      setResult(null)
      setCroppedImages([])
      detectAndProcess(base64)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      style={{
        padding: "40px",
        backgroundColor: "#0b0b0b",
        color: "#eee",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}>
      <header
        style={{
          marginBottom: "40px",
          borderBottom: "1px solid #222",
          paddingBottom: "20px",
        }}>
        <h2 style={{ color: "#00ff00", margin: 0, letterSpacing: "-1px" }}>
          CO-DUCK PRO VISION{" "}
          <small style={{ fontSize: "12px", color: "#666" }}>
            v5.1-Batch & Profile
          </small>
        </h2>
        <p style={{ color: "#888", fontSize: "14px", marginTop: "8px" }}>
          Status: <span style={{ color: "#fff" }}>{status}</span>
        </p>
      </header>

      <label
        style={{
          backgroundColor: "#00ff00",
          color: "#000",
          padding: "12px 24px",
          borderRadius: "6px",
          fontWeight: "bold",
          cursor: "pointer",
          display: "inline-block",
          marginBottom: "30px",
        }}>
        화장품 떼샷 업로드
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: "none" }}
        />
      </label>

      <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
        <div
          style={{
            position: "relative",
            flex: "1.5",
            minWidth: "350px",
            borderRadius: "16px",
            overflow: "hidden",
            backgroundColor: "#000",
            border: "1px solid #222",
          }}>
          {imageSrc && (
            <img
              ref={imgRef}
              src={imageSrc}
              style={{ width: "100%", height: "auto", display: "block" }}
              alt="target"
            />
          )}
          {loading && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.8)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 20,
                flexDirection: "column",
                gap: "15px",
              }}>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  border: "3px solid #333",
                  borderTop: "3px solid #00ff00",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p style={{ color: "#00ff00", fontWeight: "bold" }}>{status}</p>
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: "280px",
            backgroundColor: "#151515",
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid #222",
          }}>
          <h3
            style={{
              marginTop: 0,
              fontSize: "16px",
              color: "#00ff00",
              marginBottom: "20px",
            }}>
            DETECTION LOG
          </h3>
          <div style={{ fontSize: "13px", color: "#aaa" }}>
            {croppedImages.map((item, i) => (
              <div
                key={i}
                style={{ padding: "8px 0", borderBottom: "1px solid #222" }}>
                ✔ {item.label}
              </div>
            ))}
            {!loading && croppedImages.length === 0 && (
              <p>데이터 분석 대기 중...</p>
            )}
          </div>
        </div>
      </div>

      <footer style={{ marginTop: "60px" }}>
        <h3
          style={{
            color: "#00ff00",
            borderBottom: "1px solid #333",
            paddingBottom: "15px",
            marginBottom: "30px",
          }}>
          MY POUCH CANDIDATES
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "25px",
          }}>
          <AnimatePresence>
            {croppedImages.map((crop, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  backgroundColor: "#1a1a1a",
                  borderRadius: "12px",
                  border: "1px solid #333",
                  overflow: "hidden",
                }}>
                <div
                  style={{
                    width: "100%",
                    height: "200px",
                    backgroundColor: "#000",
                    backgroundImage:
                      "linear-gradient(45deg, #111 25%, transparent 25%, transparent 75%, #111 75%, #111), linear-gradient(45deg, #111 25%, transparent 25%, transparent 75%, #111 75%, #111)",
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 10px 10px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "15px",
                  }}>
                  <img
                    src={crop.src}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      filter: "drop-shadow(0 5px 15px rgba(0,0,0,0.5))",
                    }}
                    alt="nukki"
                  />
                </div>
                <div
                  style={{
                    padding: "15px",
                    textAlign: "center",
                    fontSize: "13px",
                    fontWeight: "bold",
                    color: "#fff",
                    backgroundColor: "#222",
                    minHeight: "60px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  {crop.label}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
