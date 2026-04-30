import { NextResponse } from "next/server"
import OpenAI from "openai"

// 환경 변수 체크 및 인스턴스 초기화
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error("환경 변수 OPENAI_API_KEY가 설정되지 않았습니다.")
}

const openai = new OpenAI({ apiKey })

export async function POST(req: Request) {
  const start = performance.now() // ⏱️ 타이머 시작
  console.log("--- [서버] GPT 기반 객체 탐지(Step 1) 시작 ---")

  try {
    const body = await req.json()
    const image = body.image as string | null // 타입 단언 및 null 허용

    // [TS 에러 해결] image가 null이거나 string이 아닐 경우를 위한 타입 가드
    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "유효한 base64 이미지 데이터가 필요합니다." },
        { status: 400 },
      )
    }

    const gptStart = performance.now()
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `너는 화장품 객체 탐지기야. 
          이미지에서 화장품(병, 튜브, 단지 등)만 찾아내어 정규화된 좌표([ymin, xmin, ymax, xmax])를 추출해.
          
          [응답 규칙]
          1. 반드시 다음 JSON 구조를 지켜라: { "predictions": [[ymin, xmin, ymax, xmax], ...] }
          2. 좌표값은 0.0에서 1.0 사이의 실수여야 한다.
          3. 화장품이 아닌 마우스, 키보드, 배경 등은 절대 포함하지 마라.
          4. 만약 화장품이 하나도 없다면 { "predictions": [] } 를 반환하라.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: image, detail: "low" },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    })

    const gptEnd = performance.now()
    const result = JSON.parse(response.choices[0].message.content || "{}")
    const usage = response.usage

    // 📊 로그 기록
    console.log(
      `🧠 GPT 탐지 완료: ${((gptEnd - gptStart) / 1000).toFixed(2)}초`,
    )
    if (usage) {
      console.log(
        `🔢 탐지 단계 토큰 사용량: Total ${usage.total_tokens} (P: ${usage.prompt_tokens}, C: ${usage.completion_tokens})`,
      )
    }
    console.log(
      `🚀 전체 탐지 프로세스 시간: ${((performance.now() - start) / 1000).toFixed(2)}초`,
    )

    return NextResponse.json({ ...result, usage })
  } catch (error: any) {
    console.error("🔥 [탐지 에러]:", error)
    return NextResponse.json(
      {
        error: "객체 탐지 중 서버 에러가 발생했습니다.",
        detail: error.message,
      },
      { status: 500 },
    )
  }
}
