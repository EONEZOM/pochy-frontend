"use client"

import { useState } from "react"

export default function NaverSearchTest() {
  const [searchQuery, setSearchQuery] = useState("")
  const [apiData, setApiData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // 제품명 직접 검색 함수
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) return

    setLoading(true)
    setApiData(null)

    try {
      const response = await fetch(
        `/api/naver?query=${encodeURIComponent(searchQuery)}`,
      )
      const data = await response.json()
      setApiData(data)
    } catch (err) {
      alert("검색 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "1000px",
        margin: "0 auto",
        fontFamily: "sans-serif",
      }}>
      <h1>🔍 네이버 쇼핑 데이터 확인</h1>
      <p style={{ color: "#666" }}>
        제품명을 검색하여 네이버가 주는 데이터를 분석해보세요.
      </p>

      {/* 검색창 영역 */}
      <form
        onSubmit={handleSearch}
        style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="예: 닥터지 레드 블레미쉬 수분크림"
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "16px",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 25px",
            background: "#00c73c",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
          }}>
          {loading ? "검색 중..." : "검색"}
        </button>
      </form>

      {/* 결과 리스트 영역 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}>
        {/* 왼쪽: 상품 리스트 UI 미리보기 */}
        <div
          style={{
            border: "1px solid #eaeaea",
            padding: "20px",
            borderRadius: "10px",
          }}>
          <h3>검색 결과 미리보기</h3>
          {apiData && apiData.items?.length > 0 ? (
            apiData.items.map((item: any, idx: number) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: "15px",
                  marginBottom: "20px",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "15px",
                }}>
                <img
                  src={item.image}
                  alt={item.title}
                  style={{
                    width: "80px",
                    height: "80px",
                    objectFit: "cover",
                    borderRadius: "5px",
                  }}
                />
                <div>
                  <h4
                    style={{ margin: "0 0 5px 0", fontSize: "14px" }}
                    dangerouslySetInnerHTML={{ __html: item.title }}></h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
                    {item.brand || "브랜드 없음"} | {item.category3}
                  </p>
                  <p
                    style={{
                      margin: "5px 0 0 0",
                      fontWeight: "bold",
                      color: "#f5222d",
                    }}>
                    {Number(item.lprice).toLocaleString()}원
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: "#999" }}>검색 결과가 여기에 표시됩니다.</p>
          )}
        </div>

        {/* 오른쪽: 원본 JSON 데이터 (구조 분석용) */}
        <div
          style={{
            border: "1px solid #eaeaea",
            padding: "20px",
            borderRadius: "10px",
            backgroundColor: "#2d2d2d",
            color: "#ccc",
          }}>
          <h3 style={{ color: "#fff" }}>원본 JSON 구조</h3>
          {apiData ? (
            <pre
              style={{
                fontSize: "11px",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
              }}>
              {JSON.stringify(apiData, null, 2)}
            </pre>
          ) : (
            <p>데이터 분석을 대기 중입니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
