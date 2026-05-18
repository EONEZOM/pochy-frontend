import { CATEGORY_SPECS } from '@/constants/category';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { images, hint } = await req.json();
    const MAX_IMAGES_PER_REQUEST = 9;

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
                          "main_category": "string",
                          "sub_category": "string",
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
                    5. main_category, sub_category: 반드시 아래 명세된 대분류와 소분류의 'value' 값만 사용하세요: ${CATEGORY_SPECS}
                    6. features: 제형, 성분, 특징 요약(배열).

                    [로컬라이징]
                    1. **모든 텍스트 결과물(brand_name, product_name, features)은 반드시 한국어로만 작성하세요.**
                    2. 제품 용기에 영문만 적혀 있더라도, 한국 사용자가 인지하는 브랜드명과 제품명으로 번역하거나 음차(예: "SHISEIDO" -> "시세이도", "Body Soap" -> "바디 소프/워시")하여 작성하십시오.
                    3. 단, main_category와 sub_category 필드에 한해서만 제공된 영문 'value'를 사용합니다.

                    [분석 가이드라인]
                    - 이미지 내 모든 실물 제품을 식별하세요.
                    - 배경 광고 문구는 제외하고 제품 용기에 적힌 정보에 집중하세요.
                    - 제품 용기의 문구가 명확하지 않은 경우, 이미지 내에서 제품명 혹은 제품에 관련된 정보를 찾아 분석에 사용하세요.
                    - 제품 용도에 가장 적합한 소분류를 먼저 정하고, 그에 맞는 대분류를 매칭하세요.
                    - 분류가 모호한 경우, 'Etc' 대분류와 'Other' 소분류를 사용하세요
                    - 제공된 소분류(SubCategory) 목록에 제품의 용도가 정확히 일치하는 항목이 없을 경우, 대분류와 상관없이 무조건 main_category: 'Etc', sub_category: 'Other'로 분류하세요. 절대 소분류를 임의로 추측하지 마세요.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                typeof hint === 'string' && hint.trim().length > 0
                  ? hint.trim()
                  : '이미지 속 모든 화장품 정보를 추출해줘.',
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

    // --- 토큰 소모량 로깅 ---
    const usage = response.usage;
    if (usage) {
      console.log('\n--- 🤖 OpenAI Token Usage Report ---');
      console.log(`Prompt Tokens:     ${usage.prompt_tokens}`);
      console.log(`Completion Tokens: ${usage.completion_tokens}`);
      console.log(`Total Tokens:      ${usage.total_tokens}`);
      console.log('-------------------------------------\n');
    }

    const content = response.choices[0].message.content;
    if (!content) throw new Error('GPT 응답이 비어 있습니다.');

    const parsedData = JSON.parse(content);

    if (!parsedData.results) {
      return NextResponse.json({ results: [parsedData] });
    }

    return NextResponse.json(parsedData);
  } catch (error: unknown) {
    console.error('\n--- ❌ Vision API Error ---');
    console.error(error);
    return NextResponse.json(
      { error: '이미지 분석 중 서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
