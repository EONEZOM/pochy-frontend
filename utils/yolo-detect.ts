/**
 * YOLO v8 기반 온디바이스 화장품 객체 인식 유틸리티
 *
 * 모델: /public/models/yolo26n.onnx (커스텀 학습된 경량 모델)
 * 런타임: ONNX Runtime Web (WASM 백엔드)
 *
 * 흐름:
 *   HTMLImageElement → 640×640 텐서 변환 → ONNX 추론 → 바운딩 박스 파싱 → 크롭
 *
 * WASM 파일을 CDN에서 불러오는 이유:
 *   ONNX Runtime WASM 파일들(.wasm, .mjs)은 수 MB에 달해
 *   Next.js 번들에 포함하면 초기 로드가 크게 늦어집니다.
 *   jsdelivr CDN을 쓰면 별도 빌드 설정 없이 버전 고정 로드가 가능합니다.
 */

// @ts-expect-error onnxruntime-web 타입 정의 이슈
import * as ort from 'onnxruntime-web';

const MODEL_PATH = '/models/yolo26n.onnx';
const INPUT_SIZE = 640;
const DETECT_THRESHOLD = 0.1;
const MAX_BOXES = 300;

// CDN에서 WASM 파일을 로드해 로컬에 번들링할 필요를 없앱니다.
ort.env.wasm.wasmPaths =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';

export interface YoloBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  score: number;
}

const preprocess = (img: HTMLImageElement): ort.Tensor => {
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);

  const float32Data = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
    float32Data[i] = data[i * 4] / 255.0;
    float32Data[i + INPUT_SIZE * INPUT_SIZE] = data[i * 4 + 1] / 255.0;
    float32Data[i + 2 * INPUT_SIZE * INPUT_SIZE] = data[i * 4 + 2] / 255.0;
  }
  return new ort.Tensor('float32', float32Data, [1, 3, INPUT_SIZE, INPUT_SIZE]);
};

export const detectWithYolo = async (
  img: HTMLImageElement,
): Promise<YoloBox[]> => {
  const session = await ort.InferenceSession.create(MODEL_PATH, {
    executionProviders: ['wasm'],
  });

  const input = preprocess(img);
  const outputs = await session.run({ images: input });
  const output = outputs[session.outputNames[0]].data as Float32Array;

  const boxes: YoloBox[] = [];
  for (let i = 0; i < MAX_BOXES; i++) {
    const offset = i * 6;
    const score = output[offset + 4];
    if (score < DETECT_THRESHOLD) continue;

    const rawX1 = output[offset];
    const rawY1 = output[offset + 1];
    const rawX2 = output[offset + 2];
    const rawY2 = output[offset + 3];

    // 픽셀 좌표(>1.1)와 정규화 좌표 양쪽을 모두 지원합니다.
    const x1 = (rawX1 > 1.1 ? rawX1 / INPUT_SIZE : rawX1) * img.naturalWidth;
    const y1 = (rawY1 > 1.1 ? rawY1 / INPUT_SIZE : rawY1) * img.naturalHeight;
    const x2 = (rawX2 > 1.1 ? rawX2 / INPUT_SIZE : rawX2) * img.naturalWidth;
    const y2 = (rawY2 > 1.1 ? rawY2 / INPUT_SIZE : rawY2) * img.naturalHeight;

    boxes.push({ x1, y1, x2, y2, score });
  }
  return boxes;
};

export const cropBox = (img: HTMLImageElement, box: YoloBox): string => {
  const canvas = document.createElement('canvas');
  const w = Math.max(1, Math.floor(box.x2 - box.x1));
  const h = Math.max(1, Math.floor(box.y2 - box.y1));
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')?.drawImage(img, box.x1, box.y1, w, h, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.9);
};
