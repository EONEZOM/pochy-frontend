import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_IMAGES_PER_REQUEST = 9;

const SYSTEM_PROMPT = `당신은 화장품 제품 영역 검출 전문가입니다.
각 이미지에서 **화장품 용기(튜브·병·캡·패키지)만** 감싸는 axis-aligned 바운딩 박스를 찾아 반드시 아래 JSON만 출력하세요.

{
  "results": [
    {
      "image_index": number,
      "bbox": {
        "x_min": number,
        "y_min": number,
        "x_max": number,
        "y_max": number
      },
      "confidence": number,
      "has_hand": boolean
    }
  ]
}

[규칙]
1. image_index는 0부터 시작하며, 입력 이미지 순서와 정확히 일치해야 합니다.
2. bbox 좌표는 이미지 너비·높이 대비 0~1 정규화 값입니다 (x_min < x_max, y_min < y_max).
3. bbox에는 **제품 용기 본체만** 포함하세요. 손·손가락·팔·배경·노트북·책상은 절대 포함하지 마세요.
4. 제품을 손으로 들고 있어도, 박스는 용기 실물에만 맞추세요.
5. **튜브·병·캡슐은 상단 장식(컬러 라벨)부터 하단 캡·베이스까지 전체 용기**를 하나의 bbox에 포함하세요. 장식이 강한 상단만 잘라내지 마세요.
6. 상단 컬러 영역과 하단 흰색·무채색 라벨·**검정·짙은색 캡/뚜껑/스크류캡**은 **같은 제품**입니다. 캡은 bbox **하단 경계(y_max)**까지 반드시 포함하세요.
7. 배경(책상 등)과 색이 비슷해도 용기 실루엣 전체를 포함하세요.
8. bbox는 제품을 해치지 않도록 **약간 넉넉한 여유**를 두세요.
9. 화장품이 없으면 confidence를 0에 가깝게 하고 bbox는 전체 이미지(0,0,1,1)로 두세요.
10. 손·손가락이 이미지에 보이면 has_hand: true, 없으면 false.
11. 마크다운 없이 순수 JSON만 출력하세요.`;

export async function POST(req: Request) {
  try {
    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: '이미지가 없습니다.' },
        { status: 400 },
      );
    }

    if (images.length > MAX_IMAGES_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `이미지는 최대 ${MAX_IMAGES_PER_REQUEST}장까지 분석할 수 있습니다.`,
        },
        { status: 400 },
      );
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `이미지 ${images.length}개 각각에서 화장품 용기 전체(상단부터 하단 캡·뚜껑·베이스까지) bbox를 반환해줘. HAND CREAM 튜브처럼 상단 일러스트+흰 라벨+검정 캡이면 캡 밑단까지 한 bbox로 잡고, 컬러 상단만 넣지 마. 손과 배경은 제외해.`,
            },
            ...images.map((img: string): ChatCompletionContentPart => {
              const imageUrl = img.startsWith('data:')
                ? img
                : `data:image/jpeg;base64,${img}`;

              return {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high',
                },
              };
            }),
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const usage = response.usage;
    if (usage) {
      console.log('\n--- 🤖 [vision/product-bbox] OpenAI Token Usage ---');
      console.log(
        `Prompt: ${usage.prompt_tokens} / Completion: ${usage.completion_tokens} / Total: ${usage.total_tokens}`,
      );
      console.log('---------------------------------------------------\n');
    }

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('GPT 응답이 비어 있습니다.');
    }

    const parsedData = JSON.parse(content);

    if (!parsedData.results) {
      return NextResponse.json({ results: [parsedData] });
    }

    return NextResponse.json(parsedData);
  } catch (error: unknown) {
    console.error('[vision/product-bbox] error:', error);
    return NextResponse.json(
      { error: '제품 영역 분석 중 서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

export const maxDuration = 60;
