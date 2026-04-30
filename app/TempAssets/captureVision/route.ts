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

    // 단일 캡처 이미지는 텍스트가 중요하므로 필요시 detail: "high"를 고려할 수 있으나,
    // 일단 비용 절감을 위해 사용자님의 설정대로 "low"를 유지합니다.
    const imageMessages = images.map((base64) => ({
      type: "image_url",
      image_url: { url: base64, detail: "low" },
    }))

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `너는 세계 최고의 뷰티 에디터이자 화장품 성분 분석가야. 
          제공된 이미지는 사용자가 직접 촬영한 화장품 제품 사진이야. 
          이미지 속의 패키지 디자인, 로고, 텍스트를 종합적으로 분석해서 아래 JSON 형식으로 응답해.

          {
            "results": [
              {
                "is_cosmetic": true,
                "brand": "정확한 브랜드명 (예: 셀리맥스, 아모레퍼시픽)",
                "product_name": "제품 전체 명칭 (예: 노니 에너지 앰플 마스크)",
                "product_type": "스킨케어 / 메이크업 / 바디케어 등 상세 카테고리",
                "key_features": ["이미지에서 읽어낸 핵심 특징1", "특징2", "특징3"],
                "confidence_score": 0.0 ~ 1.0 사이의 신뢰도
              }
            ]
          }

          규칙:
          1. 언어는 한국어로 응답해.
          2. 브랜드명은 국문 명칭을 우선하되, 패키지에 영문만 있다면 영문으로 작성해.
          3. 화장품이 확실히 아니라고 판단되면 is_cosmetic을 false로 반환해.
          4. 마크다운 기호 없이 순수 JSON만 출력해.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "이 제품이 무엇인지 분석해서 정보를 추출해줘.",
            },
            ...imageMessages,
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // 일관된 분석 결과를 위해 낮게 설정
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
