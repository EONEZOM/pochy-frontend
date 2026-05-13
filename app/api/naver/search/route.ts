import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query)
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })

  const clientId = process.env.NAVER_CLIENT_ID?.trim() ?? ''
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim() ?? ''
  if (!clientId || !clientSecret) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/5a029fea-afe4-4ab8-a8b7-fb154c62fb7a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'52df02'},body:JSON.stringify({sessionId:'52df02',runId:'pre-fix',hypothesisId:'H1',location:'app/api/naver/search/route.ts:missing-env',message:'naver credentials missing',data:{hasClientId:Boolean(clientId),hasClientSecret:Boolean(clientSecret),vercelEnv:process.env.VERCEL_ENV??null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.json(
      { error: 'NAVER API 환경 변수가 설정되지 않았습니다.' },
      { status: 500 },
    )
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/5a029fea-afe4-4ab8-a8b7-fb154c62fb7a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'52df02'},body:JSON.stringify({sessionId:'52df02',runId:'pre-fix',hypothesisId:'H1-H2',location:'app/api/naver/search/route.ts:env-snapshot',message:'naver credentials present',data:{hasClientId:true,hasClientSecret:true,clientIdLength:clientId.length,clientSecretLength:clientSecret.length,clientIdTrimmedOk:clientId===clientId.trim(),clientSecretTrimmedOk:clientSecret===clientSecret.trim(),vercelEnv:process.env.VERCEL_ENV??null,nodeEnv:process.env.NODE_ENV??null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

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
      const errorBody = (await res.json()) as {
        errorCode?: string
        errorMessage?: string
      }
      naverErrorCode = errorBody.errorCode ?? null
      naverErrorMessage = errorBody.errorMessage ?? null
    } catch {
      naverErrorMessage = null
    }

    // #region agent log
    console.error('[naver-search] upstream rejected', {
      naverStatus: res.status,
      naverErrorCode,
      naverErrorMessage,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      clientIdLength: clientId.length,
      clientSecretLength: clientSecret.length,
    })
    fetch('http://127.0.0.1:7243/ingest/5a029fea-afe4-4ab8-a8b7-fb154c62fb7a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'52df02'},body:JSON.stringify({sessionId:'52df02',runId:'pre-fix',hypothesisId:'H3-H5',location:'app/api/naver/search/route.ts:naver-error',message:'naver upstream rejected request',data:{naverStatus:res.status,naverErrorCode,naverErrorMessage,vercelEnv:process.env.VERCEL_ENV??null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    return NextResponse.json(
      {
        error: 'Naver API 호출에 실패했습니다.',
        details: {
          naverStatus: res.status,
          naverErrorCode,
          naverErrorMessage,
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
