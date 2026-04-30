import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query") // 'barcode' 대신 'query'를 받습니다.

  if (!query) {
    return NextResponse.json(
      { error: "검색어를 입력해주세요." },
      { status: 400 },
    )
  }

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=5`,
      {
        headers: {
          "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID || "",
          "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET || "",
        },
      },
    )

    if (!res.ok) {
      const errorData = await res.json()
      return NextResponse.json(errorData, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "네이버 API 호출 실패" }, { status: 500 })
  }
}
