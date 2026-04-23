import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query)
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })

  const res = await fetch(
    `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=1&sort=sim`,
    {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      },
    },
  )

  const data = await res.json()

  if (data.items && data.items.length > 0) {
    const item = data.items[0]
    return NextResponse.json({
      lowest_price: item.lprice, // 최저가
      mall_url: item.link, // 쇼핑몰 링크
      official_image: item.image, // 네이버 제공 상품 이미지
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
