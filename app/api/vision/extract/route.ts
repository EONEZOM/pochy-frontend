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
      model: 'gpt-5.4-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 화장품 식별 전문가입니다. 
                    이미지 내에 존재하는 **모든 화장품**을 찾아내어 반드시 아래의 JSON 구조로만 응답하세요:
                    {
                      "results": [
                        {
                          "image_index": number, // 제공된 이미지 리스트 중 해당 제품이 포함된 이미지의 0부터 시작하는 인덱스
                          "brand_name": "string",
                          "product_name": "string",
                          "category": "string",
                          "features": ["string"],
                          "is_cosmetic": boolean,
                          "confidence_score": number
                        }
                      ]
                    }

                    [데이터 추출 규칙]
                    1. 모든 제품 추출: 한 이미지에 여러 제품이 있다면 모두 개별 객체로 추출하세요.
                    2. image_index: 첫 번째 이미지는 0, 두 번째 이미지는 1 순으로 정확히 매칭하세요.
                    3. brand_name: 식별된 브랜드명.
                    4. product_name: 제품 본체의 제품명.
                    5. category: [Face, Eyes, Lip, Brow, Etc] 중 선택.
                    6. features: 제형, 성분, 특징 요약(배열).

                    [분석 가이드라인]
                    - 이미지 내 모든 실물 제품을 식별하세요.
                    - 배경 광고 문구는 제외하고 제품 용기에 적힌 정보에 집중하세요.
                    - 모든 텍스트는 한국어로 작성하세요.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '이미지 속 모든 화장품 정보를 추출해줘.' },
            ...images.map((img: string) => {
              const imageUrl = img.startsWith('data:')
                ? img
                : `data:image/jpeg;base64,${img}`

              return {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high',
                },
              }
            }),
          ] as any,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

    // --- 토큰 소모량 로깅 ---
    const usage = response.usage
    if (usage) {
      console.log('\n--- 🤖 OpenAI Token Usage Report ---')
      console.log(`Prompt Tokens:     ${usage.prompt_tokens}`)
      console.log(`Completion Tokens: ${usage.completion_tokens}`)
      console.log(`Total Tokens:      ${usage.total_tokens}`)
      console.log('-------------------------------------\n')
    }

    const content = response.choices[0].message.content
    if (!content) throw new Error('GPT 응답이 비어 있습니다.')

    const parsedData = JSON.parse(content)

    if (!parsedData.results) {
      return NextResponse.json({ results: [parsedData] })
    }

    return NextResponse.json(parsedData)
  } catch (error: any) {
    console.error('\n--- ❌ Vision API Error ---')
    console.error(error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
