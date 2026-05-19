import { useRef, useState, useCallback } from 'react';

export interface FacePrediction {
  topLeft: number[];
  bottomRight: number[];
  landmarks: number[][];
  probability: number | number[];
}

export interface ObjectPrediction {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

export interface HandKeypoint {
  x: number;
  y: number;
  z?: number;
  name?: string;
  score?: number;
}

export interface HandPrediction {
  keypoints: HandKeypoint[];
  handedness: 'Left' | 'Right';
  score?: number;
  gripDetected?: boolean;
}

export interface DetectionResult {
  faces: FacePrediction[];
  objects: ObjectPrediction[];
  hands: HandPrediction[];
}

type CocoModel = { detect: (img: HTMLVideoElement) => Promise<ObjectPrediction[]> };

// MediaPipe model refs typed loosely — we cast from dynamic imports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MPModel = any;

export function useCamera() {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const cocoRef     = useRef<CocoModel | null>(null);
  const faceRef     = useRef<MPModel>(null);
  const handRef     = useRef<MPModel>(null);
  const intervalRef = useRef<number | null>(null);
  const loadingRef  = useRef(false);

  const [stream,          setStream]          = useState<MediaStream | null>(null);
  const [permission,      setPermission]      = useState<'idle' | 'granted' | 'denied'>('idle');
  const [modelsLoading,   setModelsLoading]   = useState(false);
  const [modelsReady,     setModelsReady]     = useState(false);
  const [loadError,       setLoadError]       = useState(false);
  const [facePresent,     setFacePresent]     = useState(true);
  const [phoneDetected,   setPhoneDetected]   = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);

  const requestCamera = useCallback(async (): Promise<boolean> => {
    if (streamRef.current) {
      setStream(streamRef.current);
      setPermission('granted');
      return true;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = s;
      setStream(s);
      setPermission('granted');
      return true;
    } catch (err) {
      console.error('[FocusFlow] Camera error:', err);
      setPermission('denied');
      return false;
    }
  }, []);

  const loadModels = useCallback(async (): Promise<boolean> => {
    if (loadingRef.current || modelsReady) return modelsReady;
    loadingRef.current = true;
    setModelsLoading(true);
    setLoadError(false);
    try {
      // COCO-SSD for phone detection (TF.js — well-tested, has 'cell phone' class)
      const [tf, cocoSsd] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/coco-ssd'),
      ]);
      await tf.ready();
      cocoRef.current = await cocoSsd.load() as unknown as CocoModel;
      console.log('[FocusFlow] COCO-SSD loaded');

      // MediaPipe Tasks Vision — face + hand detection
      const { FaceDetector, HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      );

      const [faceDetector, handLandmarker] = await Promise.all([
        FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
        }),
        HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        }),
      ]);

      faceRef.current = faceDetector;
      handRef.current = handLandmarker;
      console.log('[FocusFlow] MediaPipe face + hand loaded');

      setModelsReady(true);
      setModelsLoading(false);
      loadingRef.current = false;
      return true;
    } catch (err) {
      console.error('[FocusFlow] Model load failed:', err);
      setLoadError(true);
      setModelsLoading(false);
      loadingRef.current = false;
      return false;
    }
  }, [modelsReady]);

  const runDetection = useCallback(async (
    onPhoneDetected: () => void,
    onFaceStatus: (present: boolean) => void,
  ) => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    if (!cocoRef.current) return;

    const vw = video.videoWidth  || 640;
    const vh = video.videoHeight || 480;
    const ts = performance.now(); // monotonically increasing — required by VIDEO mode

    try {
      // Run all three in parallel
      const [objects, faceResult, handResult] = await Promise.all([
        cocoRef.current.detect(video),
        faceRef.current  ? Promise.resolve(faceRef.current.detectForVideo(video, ts))  : Promise.resolve(null),
        handRef.current  ? Promise.resolve(handRef.current.detectForVideo(video, ts))  : Promise.resolve(null),
      ]);

      // ── Faces ──────────────────────────────────────────────────────
      const faces: FacePrediction[] = faceResult?.detections?.map((d: MPModel) => {
        const bb = d.boundingBox;
        // MediaPipe coords are already in pixels for FaceDetector
        return {
          topLeft:     [bb.originX, bb.originY],
          bottomRight: [bb.originX + bb.width, bb.originY + bb.height],
          // 6 keypoints: right eye, left eye, nose, mouth, right ear, left ear (normalized)
          landmarks: (d.keypoints ?? []).map((kp: MPModel) => [kp.x * vw, kp.y * vh]),
          probability: d.categories?.[0]?.score ?? 1,
        } satisfies FacePrediction;
      }) ?? [];

      const hasFace = faces.length > 0;
      setFacePresent(hasFace);
      onFaceStatus(hasFace);

      // ── Hands ──────────────────────────────────────────────────────
      const hands: HandPrediction[] = [];
      if (handResult?.landmarks) {
        handResult.landmarks.forEach((lms: MPModel[], i: number) => {
          const raw = handResult.handedness?.[i]?.[0]?.categoryName ?? 'Right';
          // MediaPipe reports the mirror of what we see (camera is mirrored)
          const handedness = (raw === 'Right' ? 'Left' : 'Right') as 'Left' | 'Right';
          const kp: HandKeypoint[] = lms.map((lm: MPModel) => ({
            x: lm.x * vw,
            y: lm.y * vh,
            z: lm.z,
          }));

          // Grip: fingertips (4,8,12,16,20) curled below their MCP knuckles (1,5,9,13,17)
          const tipIdx = [4, 8, 12, 16, 20];
          const mcpIdx = [1, 5, 9, 13, 17];
          const curled = tipIdx.filter((ti, j) => kp[ti] && kp[mcpIdx[j]] && kp[ti].y > kp[mcpIdx[j]].y).length;
          const gripDetected = curled >= 3;

          hands.push({
            keypoints: kp,
            handedness,
            score: handResult.handedness?.[i]?.[0]?.score,
            gripDetected,
          });
        });
      }

      // ── Phone detection ────────────────────────────────────────────
      // Visible phone (COCO-SSD, threshold 0.3 to catch partial/angled views)
      const hasPhoneVisible = objects.some((o: ObjectPrediction) => o.class === 'cell phone' && o.score > 0.3);
      // Grip inference: gripping hand below top 30% of frame → suspected phone in lap
      const hasPhoneGrip = hands.some(h => h.gripDetected && h.keypoints[0] && h.keypoints[0].y > vh * 0.3);

      const hasPhone = hasPhoneVisible || hasPhoneGrip;
      setPhoneDetected(hasPhone);
      if (hasPhone) onPhoneDetected();

      setDetectionResult({ faces, objects, hands });
    } catch (err) {
      console.warn('[FocusFlow] Detection error:', err);
    }
  }, []);

  const startDetection = useCallback((
    onPhoneDetected: () => void,
    onFaceStatus: (present: boolean) => void,
  ) => {
    window.setTimeout(() => runDetection(onPhoneDetected, onFaceStatus), 2000);
    intervalRef.current = window.setInterval(
      () => runDetection(onPhoneDetected, onFaceStatus), 3000,
    );
  }, [runDetection]);

  const stopDetection = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopDetection();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stopDetection]);

  return {
    videoRef, stream, permission,
    modelsLoading, modelsReady, loadError,
    facePresent, phoneDetected, detectionResult,
    requestCamera, loadModels,
    startDetection, stopDetection, stopCamera,
  };
}
