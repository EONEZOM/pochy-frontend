import { NextResponse } from 'next/server'

type NaverApiErrorBody = {
  errorCode?: string
  errorMessage?: string
}

const getNaverShoppingOperatorHint = (
  errorCode: string | null,
): string | null => {
  if (errorCode !== '024') {
    return null
  }
  return 'NAVER_CLIENT_ID·NAVER_CLIENT_SECRET은 검색 API가 사용 설정된 쇼핑용 애플리케이션 값이어야 합니다. 네이버 로그인(OAuth) 키를 넣었는지 Vercel Production 환경 변수를 확인하세요.';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query)
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })

  const clientId = process.env.NAVER_CLIENT_ID?.trim() ?? ''
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim() ?? ''
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'NAVER API 환경 변수가 설정되지 않았습니다.' },
      { status: 500 },
    )
  }

  /** 유사도 상위 N건 중 `lprice` 최솟값을 최저가로 사용 (단일 1건은 변별력이 낮음) */
  const display = 10

  const res = await fetch(
    `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=${display}&sort=sim`,
    {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    },
  )

  if (!res.ok) {
    let naverErrorCode: string | null = null
    let naverErrorMessage: string | null = null
    try {
      const errorBody = (await res.json()) as NaverApiErrorBody
      naverErrorCode = errorBody.errorCode ?? null
      naverErrorMessage = errorBody.errorMessage ?? null
    } catch {
      naverErrorMessage = null
    }

    const operatorHint = getNaverShoppingOperatorHint(naverErrorCode)

    return NextResponse.json(
      {
        error: 'Naver API 호출에 실패했습니다.',
        details: {
          naverStatus: res.status,
          naverErrorCode,
          naverErrorMessage,
          ...(operatorHint ? { operatorHint } : {}),
        },
      },
      { status: res.status },
    )
  }

  const data = await res.json()

  const parseLprice = (value: unknown): number | null => {
    if (value == null || value === '') {
      return null
    }
    const n = Number(String(value).replace(/,/g, '').trim())
    return Number.isFinite(n) ? n : null
  }

  if (data.items && data.items.length > 0) {
    const items = data.items as Array<{
      lprice?: string
      link?: string
      image?: string
      category1?: string
      category2?: string
      category3?: string
      category4?: string
    }>
    const item = items[0]

    let lowestNumeric: number | null = null
    for (const row of items) {
      const p = parseLprice(row.lprice)
      if (p != null && (lowestNumeric == null || p < lowestNumeric)) {
        lowestNumeric = p
      }
    }

    const lowest_price =
      lowestNumeric != null
        ? lowestNumeric
        : parseLprice(item.lprice) ?? item.lprice

    return NextResponse.json({
      lowest_price,
      mall_url: item.link,
      official_image: item.image,
      category_list: [
        item.category1,
        item.category2,
        item.category3,
        item.category4,
      ].filter(Boolean),
    })
  }

  return NextResponse.json({ message: 'No results found' })
}
