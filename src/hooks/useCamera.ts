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

export interface DetectionResult {
  faces: FacePrediction[];
  objects: ObjectPrediction[];
}

type CocoModel = { detect: (img: HTMLVideoElement) => Promise<ObjectPrediction[]> };
type FaceModel = { estimateFaces: (img: HTMLVideoElement, returnTensors: boolean) => Promise<unknown[]> };

export function useCamera() {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const cocoRef     = useRef<CocoModel | null>(null);
  const faceRef     = useRef<FaceModel | null>(null);
  const intervalRef = useRef<number | null>(null);
  const loadingRef  = useRef(false);

  // stream as state so CameraFeed re-renders and its useEffect fires when it arrives
  const [stream,          setStream]          = useState<MediaStream | null>(null);
  const [permission,      setPermission]      = useState<'idle' | 'granted' | 'denied'>('idle');
  const [modelsLoading,   setModelsLoading]   = useState(false);
  const [modelsReady,     setModelsReady]     = useState(false);
  const [loadError,       setLoadError]       = useState(false);
  const [facePresent,     setFacePresent]     = useState(true);
  const [phoneDetected,   setPhoneDetected]   = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);

  const requestCamera = useCallback(async (): Promise<boolean> => {
    // Re-use existing stream (handles StrictMode double-invoke)
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
      setStream(s);        // triggers CameraFeed to attach via its own useEffect
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
      const [tf, cocoSsd, blazeface] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/coco-ssd'),
        import('@tensorflow-models/blazeface'),
      ]);
      await tf.ready();
      const [coco, face] = await Promise.all([
        cocoSsd.load(),
        blazeface.load(),
      ]);
      cocoRef.current = coco as unknown as CocoModel;
      faceRef.current  = face as unknown as FaceModel;
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
    if (!cocoRef.current || !faceRef.current) return;
    try {
      const rawFaces = await faceRef.current.estimateFaces(video, false);
      const faces    = (rawFaces as FacePrediction[]).filter(f => f?.topLeft && f?.bottomRight);
      const hasFace  = faces.length > 0;
      setFacePresent(hasFace);
      onFaceStatus(hasFace);
      let objects: ObjectPrediction[] = [];
      if (hasFace) {
        objects = await cocoRef.current.detect(video);
        const hasPhone = objects.some(o => o.class === 'cell phone' && o.score > 0.4);
        setPhoneDetected(hasPhone);
        if (hasPhone) onPhoneDetected();
      } else {
        setPhoneDetected(false);
      }
      setDetectionResult({ faces, objects });
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
