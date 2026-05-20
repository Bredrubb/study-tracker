import { type RefObject, useEffect, useRef } from 'react';
import type { DetectionResult } from '../hooks/useCamera';

interface Props {
  videoRef: RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  permission: 'idle' | 'granted' | 'denied';
  facePresent: boolean;
  phoneDetected: boolean;
  modelsLoading: boolean;
  modelsReady: boolean;
  loadError: boolean;
  detectionResult: DetectionResult | null;
}

// BlazeFace landmark indices
const LANDMARK_STYLE = [
  { label: 'Eye',   color: '#60a5fa' }, // 0 right eye
  { label: 'Eye',   color: '#60a5fa' }, // 1 left eye
  { label: 'Nose',  color: '#fbbf24' }, // 2 nose
  { label: 'Mouth', color: '#f472b6' }, // 3 mouth
  { label: 'Ear',   color: '#a78bfa' }, // 4 right ear
  { label: 'Ear',   color: '#a78bfa' }, // 5 left ear
];

export function CameraFeed({
  videoRef, stream, permission, facePresent, phoneDetected,
  modelsLoading, modelsReady, loadError, detectionResult,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Attach stream to video element whenever stream changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(e => console.warn('[FocusFlow] video.play():', e));
    return () => { video.srcObject = null; };
  }, [stream, videoRef]);

  // Redraw overlay whenever detection results change
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    canvas.width = vw;
    canvas.height = vh;
    ctx.clearRect(0, 0, vw, vh);

    if (!detectionResult || !modelsReady) return;

    // Mirror helper: video is CSS-mirrored, so flip X coords to match
    const mx = (x: number) => vw - x;

    ctx.lineWidth = 2;
    ctx.font = 'bold 13px system-ui, sans-serif';

    // ── Face bounding boxes + landmarks ──────────────────────────────
    detectionResult.faces.forEach(face => {
      const [x1, y1] = face.topLeft;
      const [x2, y2] = face.bottomRight;
      const fw = x2 - x1;
      const fh = y2 - y1;
      // Mirror: the right edge in original space → left edge in display
      const dispX = mx(x2);

      // Bounding box
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(dispX, y1, fw, fh, 4);
      ctx.stroke();

      // Label background + text
      const prob = Array.isArray(face.probability) ? face.probability[0] : face.probability;
      const label = `Face ${Math.round(Number(prob) * 100)}%`;
      ctx.font = 'bold 11px system-ui, sans-serif';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
      ctx.fillRect(dispX, y1 - 18, tw + 8, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, dispX + 4, y1 - 4);

      // Landmarks
      if (Array.isArray(face.landmarks)) {
        face.landmarks.forEach((lm, i) => {
          const style = LANDMARK_STYLE[i] ?? { label: '', color: '#fff' };
          const lx = mx(lm[0]);
          const ly = lm[1];

          // Glow dot
          ctx.shadowColor = style.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(lx, ly, 5, 0, Math.PI * 2);
          ctx.fillStyle = style.color;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Tiny label to the right
          ctx.font = '10px system-ui, sans-serif';
          ctx.fillStyle = style.color;
          ctx.fillText(style.label, lx + 7, ly + 3);
        });
      }
    });

    // ── Object detections ─────────────────────────────────────────────
    detectionResult.objects
      .filter(o => o.score > 0.35)
      .forEach(obj => {
        const [x, y, w, h] = obj.bbox;
        const dispX = mx(x + w);

        const isPhone = obj.class === 'cell phone';
        const boxColor = isPhone ? 'rgba(239, 68, 68, 0.9)' : 'rgba(251, 191, 36, 0.9)';
        const fillColor = isPhone ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)';
        const icon = isPhone ? '📱' : '📦';

        // Fill
        ctx.fillStyle = fillColor;
        ctx.fillRect(dispX, y, w, h);

        // Border (dashed for phone)
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 2;
        if (isPhone) {
          ctx.setLineDash([6, 3]);
        }
        ctx.strokeRect(dispX, y, w, h);
        ctx.setLineDash([]);

        // Label
        const label = `${icon} ${obj.class} ${Math.round(obj.score * 100)}%`;
        ctx.font = 'bold 11px system-ui, sans-serif';
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = isPhone ? 'rgba(239, 68, 68, 0.9)' : 'rgba(251, 191, 36, 0.9)';
        ctx.fillRect(dispX, y, tw + 8, 18);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, dispX + 4, y + 13);
      });

    // ── Hand skeletons ────────────────────────────────────────────────
    const HAND_CONNECTIONS = [
      [0,1],[1,2],[2,3],[3,4],       // thumb
      [0,5],[5,6],[6,7],[7,8],       // index
      [0,9],[9,10],[10,11],[11,12],  // middle
      [0,13],[13,14],[14,15],[15,16],// ring
      [0,17],[17,18],[18,19],[19,20],// pinky
      [5,9],[9,13],[13,17],          // palm
    ];
    const FINGERTIP_IDX = new Set([4, 8, 12, 16, 20]);

    detectionResult.hands.forEach(hand => {
      const kp = hand.keypoints;
      const handColor = hand.gripDetected ? 'rgba(239,68,68,0.9)' : 'rgba(139,92,246,0.9)';

      // Bones
      ctx.strokeStyle = handColor;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
      HAND_CONNECTIONS.forEach(([a, b]) => {
        const pa = kp[a];
        const pb = kp[b];
        if (!pa || !pb) return;
        ctx.beginPath();
        ctx.moveTo(mx(pa.x), pa.y);
        ctx.lineTo(mx(pb.x), pb.y);
        ctx.stroke();
      });

      // Joints
      kp.forEach((pt, i) => {
        if (!pt) return;
        const isTip = FINGERTIP_IDX.has(i);
        ctx.beginPath();
        ctx.arc(mx(pt.x), pt.y, isTip ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? handColor : 'rgba(255,255,255,0.8)';
        ctx.fill();
      });

      // Label above wrist
      const wrist = kp[0];
      if (wrist) {
        const label = hand.gripDetected ? `✋ Grip (${hand.handedness})` : `🖐 ${hand.handedness}`;
        ctx.font = 'bold 11px system-ui, sans-serif';
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = handColor;
        ctx.fillRect(mx(wrist.x) - tw / 2 - 4, wrist.y - 22, tw + 8, 18);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, mx(wrist.x) - tw / 2, wrist.y - 8);
      }
    });

    // ── "No face" indicator ──────────────────────────────────────────
    if (modelsReady && detectionResult.faces.length === 0) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(vw * 0.25, vh * 0.15, vw * 0.5, vh * 0.7);
      ctx.setLineDash([]);
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.textAlign = 'center';
      ctx.fillText('No face detected', vw / 2, vh * 0.5);
      ctx.textAlign = 'left';
    }
  }, [detectionResult, modelsReady, videoRef]);

  const borderColor = phoneDetected ? '#ef4444' : !facePresent && modelsReady ? '#f59e0b' : modelsReady ? '#10b981' : '#1e1e2e';
  const isVisible = permission === 'granted';

  return (
    <div style={{
      position: 'fixed',
      bottom: '5.5rem',
      right: '1.25rem',
      width: '340px',
      borderRadius: '0.875rem',
      overflow: 'hidden',
      border: `2px solid ${isVisible ? borderColor : '#1e1e2e'}`,
      background: '#0a0a0f',
      boxShadow: isVisible ? `0 0 20px ${borderColor}50` : 'none',
      transition: 'border-color 0.4s, box-shadow 0.4s',
      zIndex: 50,
      // Keep in DOM always so videoRef is attached, but hide until granted
      visibility: isVisible ? 'visible' : 'hidden',
      opacity: isVisible ? 1 : 0,
    }}>
      {/* Video + canvas stacked */}
      <div style={{ position: 'relative', width: '100%' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }}
        />
        {/* Canvas overlay — also mirrored to match video */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Status bar */}
      <div style={{
        padding: '0.3rem 0.5rem',
        background: '#0d0d14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.65rem',
        color: '#e2e8f0',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
            background: phoneDetected ? '#ef4444' : !facePresent && modelsReady ? '#f59e0b' : modelsReady ? '#10b981' : '#3f3f5a',
            boxShadow: modelsReady ? `0 0 6px ${phoneDetected ? '#ef4444' : !facePresent ? '#f59e0b' : '#10b981'}` : 'none',
          }} />
          {phoneDetected ? 'Phone!' : !facePresent && modelsReady ? 'No face' : modelsReady ? 'Monitoring' : 'Standby'}
        </span>
        <span style={{ color: '#64748b' }}>
          {modelsLoading ? '⟳ Loading AI…' : loadError ? '⚠ Error' : modelsReady ? '🤖 AI active' : ''}
        </span>
      </div>
    </div>
  );
}
