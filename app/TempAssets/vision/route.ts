import { NextResponse } from "next/server"
import OpenAI from "openai"

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) throw new Error("OPENAI_API_KEY가 환경 변수에 없습니다.")

const openai = new OpenAI({ apiKey })

export async function POST(req: Request) {
  const start = performance.now()

  try {
    const { images } = await req.json()

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400 })
    }

    // [비용 절감] detail: "low"로 변경 (13만 토큰 -> 1만 토큰 이하로 감소)
    const imageMessages = images.map((base64) => ({
      type: "image_url",
      image_url: { url: base64, detail: "low" },
    }))

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `너는 세계 최고의 뷰티 제품 분석 전문가야. 
          전달된 이미지들을 순서대로 분석해서 반드시 아래의 JSON 형식을 지켜서 응답해.
          
          {
            "results": [
              {
                "is_cosmetic": true,
                "brand": "브랜드명",
                "product_name": "제품명 풀네임",
                "product_type": "카테고리",
                "key_features": ["특징1", "특징2", "특징3"],
                "confidence_score": 0.95
              }
            ]
          }
          
          주의: 화장품이 아니면 is_cosmetic을 false로 하고 나머지는 빈 문자열로 채워.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이미지 ${images.length}개를 순서대로 분석해줘.`,
            },
            ...imageMessages,
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    })

    const result = JSON.parse(response.choices[0].message.content || "{}")

    return NextResponse.json({
      ...result,
      usage: response.usage,
      duration: ((performance.now() - start) / 1000).toFixed(2),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
