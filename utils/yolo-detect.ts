/**
 * YOLO v8 기반 온디바이스 화장품 객체 인식 유틸리티
 *
 * 모델: /public/models/yolo26n.onnx (커스텀 학습된 경량 모델)
 * 런타임: ONNX Runtime Web (WASM 백엔드)
 *
 * 흐름:
 *   HTMLImageElement → letterbox 640×640 → ONNX 추론 → NMS → 패딩 크롭
 */

// @ts-expect-error onnxruntime-web 타입 정의 이슈
import * as ort from 'onnxruntime-web';

const MODEL_PATH = '/models/yolo26n.onnx';
const INPUT_SIZE = 640;
const DETECT_THRESHOLD = 0.15;
const MAX_RAW_BOXES = 300;
const MAX_BOXES_PER_IMAGE = 8;
const NMS_IOU_THRESHOLD = 0.45;
const MIN_BOX_AREA_RATIO = 0.008;
const CROP_PADDING_RATIO = 0.06;
const LETTERBOX_FILL = '#727272';

ort.env.wasm.wasmPaths =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';

export interface YoloBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  score: number;
}

type LetterboxMeta = {
  scale: number;
  padX: number;
  padY: number;
};

let cachedSession: Promise<ort.InferenceSession> | null = null;

const getSession = (): Promise<ort.InferenceSession> => {
  if (cachedSession === null) {
    cachedSession = ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ['wasm'],
    });
  }
  return cachedSession as Promise<ort.InferenceSession>;
};

const preprocessLetterbox = (
  img: HTMLImageElement,
): { tensor: ort.Tensor; meta: LetterboxMeta } => {
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const scale = Math.min(INPUT_SIZE / imgW, INPUT_SIZE / imgH);
  const newW = Math.round(imgW * scale);
  const newH = Math.round(imgH * scale);
  const padX = (INPUT_SIZE - newW) / 2;
  const padY = (INPUT_SIZE - newH) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('YOLO 전처리 캔버스를 초기화할 수 없습니다.');
  }

  ctx.fillStyle = LETTERBOX_FILL;
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  ctx.drawImage(img, padX, padY, newW, newH);

  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const float32Data = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
    float32Data[i] = data[i * 4] / 255.0;
    float32Data[i + INPUT_SIZE * INPUT_SIZE] = data[i * 4 + 1] / 255.0;
    float32Data[i + 2 * INPUT_SIZE * INPUT_SIZE] = data[i * 4 + 2] / 255.0;
  }

  return {
    tensor: new ort.Tensor('float32', float32Data, [
      1,
      3,
      INPUT_SIZE,
      INPUT_SIZE,
    ]),
    meta: { scale, padX, padY },
  };
};

const toInputSpace = (raw: number): number =>
  raw > 1.1 ? raw : raw * INPUT_SIZE;

const toOriginalCoord = (
  valueIn640: number,
  meta: LetterboxMeta,
): number => (valueIn640 - meta.padX) / meta.scale;

const parseBoxesFromOutput = (
  output: Float32Array,
  img: HTMLImageElement,
  meta: LetterboxMeta,
): YoloBox[] => {
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const boxes: YoloBox[] = [];

  for (let i = 0; i < MAX_RAW_BOXES; i++) {
    const offset = i * 6;
    const score = output[offset + 4];
    if (score < DETECT_THRESHOLD) {
      continue;
    }

    const x1 = toOriginalCoord(toInputSpace(output[offset]), meta);
    const y1 = toOriginalCoord(toInputSpace(output[offset + 1]), meta);
    const x2 = toOriginalCoord(toInputSpace(output[offset + 2]), meta);
    const y2 = toOriginalCoord(toInputSpace(output[offset + 3]), meta);

    const clampedX1 = Math.max(0, Math.min(imgW, x1));
    const clampedY1 = Math.max(0, Math.min(imgH, y1));
    const clampedX2 = Math.max(0, Math.min(imgW, x2));
    const clampedY2 = Math.max(0, Math.min(imgH, y2));

    if (clampedX2 <= clampedX1 || clampedY2 <= clampedY1) {
      continue;
    }

    boxes.push({
      x1: clampedX1,
      y1: clampedY1,
      x2: clampedX2,
      y2: clampedY2,
      score,
    });
  }

  return boxes;
};

const boxArea = (box: YoloBox): number =>
  Math.max(0, box.x2 - box.x1) * Math.max(0, box.y2 - box.y1);

export const yoloBoxIou = (a: YoloBox, b: YoloBox): number => {
  const interX1 = Math.max(a.x1, b.x1);
  const interY1 = Math.max(a.y1, b.y1);
  const interX2 = Math.min(a.x2, b.x2);
  const interY2 = Math.min(a.y2, b.y2);
  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const interArea = interW * interH;
  const unionArea = boxArea(a) + boxArea(b) - interArea;
  if (unionArea <= 0) {
    return 0;
  }
  return interArea / unionArea;
};

const applyNms = (boxes: YoloBox[], threshold = NMS_IOU_THRESHOLD): YoloBox[] => {
  const sorted = [...boxes].sort((a, b) => b.score - a.score);
  const kept: YoloBox[] = [];

  for (const box of sorted) {
    const overlaps = kept.some((k) => yoloBoxIou(k, box) >= threshold);
    if (!overlaps) {
      kept.push(box);
    }
  }

  return kept;
};

const expandBox = (
  box: YoloBox,
  imgW: number,
  imgH: number,
  ratio = CROP_PADDING_RATIO,
): YoloBox => {
  const w = box.x2 - box.x1;
  const h = box.y2 - box.y1;
  const padX = w * ratio;
  const padY = h * ratio;

  return {
    x1: Math.max(0, box.x1 - padX),
    y1: Math.max(0, box.y1 - padY),
    x2: Math.min(imgW, box.x2 + padX),
    y2: Math.min(imgH, box.y2 + padY),
    score: box.score,
  };
};

const filterByMinArea = (boxes: YoloBox[], img: HTMLImageElement): YoloBox[] => {
  const imgArea = img.naturalWidth * img.naturalHeight;
  if (imgArea <= 0) {
    return boxes;
  }

  return boxes.filter((box) => boxArea(box) / imgArea >= MIN_BOX_AREA_RATIO);
};

/** @deprecated detectCosmeticBoxesFromImage 사용을 권장합니다. */
export const detectWithYolo = async (
  img: HTMLImageElement,
): Promise<YoloBox[]> => detectCosmeticBoxesFromImage(img);

export const detectCosmeticBoxesFromImage = async (
  img: HTMLImageElement,
): Promise<YoloBox[]> => {
  const session = await getSession();
  const { tensor, meta } = preprocessLetterbox(img);
  const outputs = await session.run({ images: tensor });
  const output = outputs[session.outputNames[0]].data as Float32Array;

  const parsed = parseBoxesFromOutput(output, img, meta);
  const areaFiltered = filterByMinArea(parsed, img);
  const nmsed = applyNms(areaFiltered);
  const expanded = nmsed.map((box) =>
    expandBox(box, img.naturalWidth, img.naturalHeight),
  );

  return expanded
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_BOXES_PER_IMAGE);
};

export const cropBox = (img: HTMLImageElement, box: YoloBox): string => {
  const canvas = document.createElement('canvas');
  const w = Math.max(1, Math.floor(box.x2 - box.x1));
  const h = Math.max(1, Math.floor(box.y2 - box.y1));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('크롭 캔버스를 초기화할 수 없습니다.');
  }
  ctx.drawImage(img, box.x1, box.y1, w, h, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.92);
};

export const cropFullImage = (img: HTMLImageElement): string => {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('전체 이미지 크롭 캔버스를 초기화할 수 없습니다.');
  }
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
};
