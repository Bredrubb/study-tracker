import * as ort from 'onnxruntime-web';

// Point WASM binaries at jsDelivr CDN — must match installed package version
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';

const MODEL_URL =
  'https://huggingface.co/Xenova/yolov8n/resolve/main/onnx/model.onnx';

const COCO_CLASSES = [
  'person','bicycle','car','motorcycle','airplane','bus','train','truck','boat',
  'traffic light','fire hydrant','stop sign','parking meter','bench','bird','cat',
  'dog','horse','sheep','cow','elephant','bear','zebra','giraffe','backpack',
  'umbrella','handbag','tie','suitcase','frisbee','skis','snowboard','sports ball',
  'kite','baseball bat','baseball glove','skateboard','surfboard','tennis racket',
  'bottle','wine glass','cup','fork','knife','spoon','bowl','banana','apple',
  'sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake','chair',
  'couch','potted plant','bed','dining table','toilet','tv','laptop','mouse',
  'remote','keyboard','cell phone','microwave','oven','toaster','sink',
  'refrigerator','book','clock','vase','scissors','teddy bear','hair drier',
  'toothbrush',
];

const INPUT_SIZE = 640;

export interface YoloPrediction {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // x, y, w, h in source pixels
}

let session: ort.InferenceSession | null = null;
let preprocessCanvas: HTMLCanvasElement | null = null;

export async function loadYolo(): Promise<void> {
  if (session) return;
  session = await ort.InferenceSession.create(MODEL_URL, {
    executionProviders: ['webgl', 'wasm'],
  });
  preprocessCanvas = document.createElement('canvas');
  preprocessCanvas.width  = INPUT_SIZE;
  preprocessCanvas.height = INPUT_SIZE;
}

function toTensor(source: HTMLVideoElement | HTMLCanvasElement): ort.Tensor {
  const canvas = preprocessCanvas!;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);

  const float = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
    float[i]                           = data[i * 4]     / 255; // R
    float[INPUT_SIZE * INPUT_SIZE + i] = data[i * 4 + 1] / 255; // G
    float[2 * INPUT_SIZE * INPUT_SIZE + i] = data[i * 4 + 2] / 255; // B
  }
  return new ort.Tensor('float32', float, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

function iou(a: number[], b: number[]): number {
  const ix1 = Math.max(a[0], b[0]), iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(a[2], b[2]), iy2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  if (inter === 0) return 0;
  const aArea = (a[2]-a[0]) * (a[3]-a[1]);
  const bArea = (b[2]-b[0]) * (b[3]-b[1]);
  return inter / (aArea + bArea - inter);
}

function decode(
  output: Float32Array,
  scaleX: number,
  scaleY: number,
  confThreshold: number,
  iouThreshold: number,
): YoloPrediction[] {
  // YOLOv8 output: [84, 8400] — 4 bbox coords + 80 class scores per anchor
  const N = 8400;
  type Raw = { xyxy: number[]; bbox: [number,number,number,number]; score: number; cls: string };
  const raws: Raw[] = [];

  for (let i = 0; i < N; i++) {
    let maxScore = confThreshold;
    let maxClass = -1;
    for (let c = 0; c < 80; c++) {
      const s = output[(4 + c) * N + i];
      if (s > maxScore) { maxScore = s; maxClass = c; }
    }
    if (maxClass === -1) continue;

    const cx = output[0 * N + i] * scaleX;
    const cy = output[1 * N + i] * scaleY;
    const w  = output[2 * N + i] * scaleX;
    const h  = output[3 * N + i] * scaleY;
    const x1 = cx - w / 2, y1 = cy - h / 2;

    raws.push({
      xyxy: [x1, y1, x1 + w, y1 + h],
      bbox: [x1, y1, w, h],
      score: maxScore,
      cls: COCO_CLASSES[maxClass] ?? `class${maxClass}`,
    });
  }

  raws.sort((a, b) => b.score - a.score);
  const suppressed = new Set<number>();
  const kept: YoloPrediction[] = [];

  for (let i = 0; i < raws.length; i++) {
    if (suppressed.has(i)) continue;
    kept.push({ class: raws[i].cls, score: raws[i].score, bbox: raws[i].bbox });
    for (let j = i + 1; j < raws.length; j++) {
      if (!suppressed.has(j) && raws[i].cls === raws[j].cls && iou(raws[i].xyxy, raws[j].xyxy) > iouThreshold) {
        suppressed.add(j);
      }
    }
  }

  return kept;
}

export async function detectObjects(
  source: HTMLVideoElement | HTMLCanvasElement,
  srcWidth: number,
  srcHeight: number,
  confThreshold = 0.25,
  iouThreshold  = 0.45,
): Promise<YoloPrediction[]> {
  if (!session) throw new Error('YOLO not loaded');
  const tensor = toTensor(source);
  const { output0 } = await session.run({ images: tensor });
  const data = output0.data as Float32Array;
  return decode(data, srcWidth / INPUT_SIZE, srcHeight / INPUT_SIZE, confThreshold, iouThreshold);
}
