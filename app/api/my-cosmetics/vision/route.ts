import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
          content: `너는 세계 최고의 뷰티 제품 분석 전문가야.
전달된 이미지들을 순서대로 분석해서 반드시 아래 JSON 형식으로 응답해.

{
  "results": [
    {
      "is_cosmetic": true,
      "brand": "브랜드명",
      "product_name": "제품명 풀네임",
      "product_type": "스킨케어 / 메이크업 / 바디케어 등 상세 카테고리",
      "key_features": ["특징1", "특징2", "특징3"],
      "confidence_score": 0.95
    }
  ]
}

주의:
1. 이미지 개수와 results 배열 길이를 반드시 일치시켜.
2. 화장품이 아니면 is_cosmetic을 false로 하고 나머지는 빈 문자열/배열로 채워.
3. 마크다운 없이 순수 JSON만 출력해.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `이미지 ${images.length}개를 순서대로 분석해줘.` },
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
      console.log(`Prompt: ${usage.prompt_tokens} / Completion: ${usage.completion_tokens} / Total: ${usage.total_tokens}`);
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
      { error: error instanceof Error ? error.message : '분석 중 서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

export const maxDuration = 60;
