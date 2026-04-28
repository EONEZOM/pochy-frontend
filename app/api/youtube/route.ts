import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query) return NextResponse.json({ items: [] })

  const API_KEY = process.env.YOUTUBE_API_KEY
  if (!API_KEY) {
    return NextResponse.json(
      { error: 'YOUTUBE_API_KEY가 설정되지 않았습니다.' },
      { status: 500 },
    )
  }
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(
    query,
  )}&type=video&key=${API_KEY}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json(
        { error: 'YouTube API 호출에 실패했습니다.' },
        { status: res.status },
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
