import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { images } = await req.json()

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 })
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 화장품 식별 전문가입니다. 
                    반드시 아래의 JSON 구조로만 응답하세요:
                    {
                      "results": [
                        {
                          "brand_name": "string",
                          "product_name": "string",
                          "category": "string",
                          "product_detail": ["string"],
                          "is_cosmetic": boolean,
                          "confidence_score": number
                        }
                      ]
                    }

                    [데이터 추출 규칙]
                    1. brand_name: 이미지에서 식별된 브랜드명을 추출하세요.
                    2. product_name: 제품 본체에 적힌 제품명을 추출하세요.
                    3. category: 다음 중 가장 적절한 하나를 선택하세요: [Face, Eyes, Lip, Brow, SkinCare, Etc].
                    4. product_details: 제형, 주요 성분, 제품 특징으로 요약(배열 형식)

                    [분석 가이드라인]
                    1. 이미지 중앙의 실물 제품 용기에 적힌 텍스트를 최우선으로 합니다.
                    2. 배경의 광고 문구(가격, 배송, 할인)는 절대 포함하지 마세요.
                    3. 모든 텍스트는 한국어로 작성하세요.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '이미지 속 모든 화장품 정보를 추출해줘.' },
            ...images.map((img: string) => ({
              type: 'image_url' as const,
              image_url: { url: img, detail: 'high' as const },
            })),
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('GPT 응답이 비어 있습니다.')

    const parsedData = JSON.parse(content)

    if (!parsedData.results) {
      return NextResponse.json({ results: [parsedData], usage: response.usage })
    }

    return NextResponse.json({ ...parsedData, usage: response.usage })
  } catch (error: any) {
    console.error('--- Vision API Detail Error ---')
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
