import { CATEGORY_SPECS } from '@/constants/category';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CROP_SINGLE_PRODUCT_RULE = `각 이미지는 화장품 제품 하나만 담긴 크롭 사진입니다.
이미지 개수와 results 배열 길이를 반드시 일치시키고, image_index는 0부터 시작하는 이미지 순서와 정확히 일치해야 합니다.
한 이미지에서 여러 result를 만들지 마세요.`;

export async function POST(req: Request) {
  const start = performance.now();

  try {
    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
    }

    const imageMessages: ChatCompletionContentPart[] = images.map(
      (base64: string) => ({
        type: 'image_url',
        image_url: {
          url: base64.startsWith('data:')
            ? base64
            : `data:image/jpeg;base64,${base64}`,
          detail: 'high',
        },
      }),
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 화장품 식별 전문가입니다.
전달된 이미지를 분석해 반드시 아래 JSON 구조로만 응답하세요:
{
  "results": [
    {
      "image_index": number,
      "brand_name": "string",
      "product_name": "string",
      "main_category": "string",
      "sub_category": "string",
      "features": ["string"],
      "is_cosmetic": boolean,
      "confidence_score": number
    }
  ]
}

[데이터 추출 규칙]
1. ${CROP_SINGLE_PRODUCT_RULE}
2. brand_name: 식별된 브랜드명(한국어).
3. product_name: 제품 본체의 제품명(한국어).
4. main_category, sub_category: 반드시 아래 명세의 value만 사용: ${CATEGORY_SPECS}
5. features: 제형·성분·특징 요약(배열, 한국어).
6. 화장품이 아니면 is_cosmetic=false, confidence_score는 낮게 설정.

[분석 가이드라인]
- 제품 용기 라벨·로고 텍스트를 최우선으로 읽으세요.
- 배경 광고 문구는 제외하고 제품 용기 정보에 집중하세요.
- 분류가 모호하면 main_category: 'Etc', sub_category: 'Other'를 사용하세요.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `이미지 ${images.length}개를 순서대로 분석해줘. ${CROP_SINGLE_PRODUCT_RULE}`,
            },
            ...imageMessages,
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const usage = response.usage;
    if (usage) {
      console.log('\n--- 🤖 [my-cosmetics/vision] OpenAI Token Usage ---');
      console.log(
        `Prompt: ${usage.prompt_tokens} / Completion: ${usage.completion_tokens} / Total: ${usage.total_tokens}`,
      );
      console.log('---------------------------------------------------\n');
    }

    const result = JSON.parse(response.choices[0].message.content ?? '{}');

    return NextResponse.json({
      ...result,
      duration: ((performance.now() - start) / 1000).toFixed(2),
    });
  } catch (error: unknown) {
    console.error('[my-cosmetics/vision] error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '분석 중 서버 오류가 발생했습니다.',
      },
      { status: 500 },
    );
  }
}

export const maxDuration = 60;
