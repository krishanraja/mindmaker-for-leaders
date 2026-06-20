import { useRef, useState, useEffect, useCallback, type RefObject, type CSSProperties } from 'react';

interface UseZoomPanOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  dims: { w: number; h: number };
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
}

interface ZoomPanResult {
  scale: number;
  translateX: number;
  translateY: number;
  svgTransform: string;
  domTransformStyle: CSSProperties;
  svgToScreen: (x: number, y: number) => { x: number; y: number };
  isZoomed: boolean;
  resetZoom: () => void;
  wasGesture: () => boolean;
  /** Step the zoom up one notch, centred on the container (for a +/- control). */
  zoomIn: () => void;
  /** Step the zoom down one notch, centred on the container. */
  zoomOut: () => void;
  /** True when the user is zoomed in OR out from the initial fit (a control can offer "fit"). */
  canFit: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getTouchDistance(t1: Touch, t2: Touch): number {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

function getTouchMidpoint(t1: Touch, t2: Touch): { x: number; y: number } {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

export function useZoomPan({
  containerRef,
  dims,
  minScale = 1,
  maxScale = 3,
  initialScale = 1,
}: UseZoomPanOptions): ZoomPanResult {
  const [scale, setScale] = useState(initialScale);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  const initialScaleRef = useRef(initialScale);

  // Refs for gesture tracking (avoid re-renders during gestures)
  const scaleRef = useRef(initialScale);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const pinchStartTxRef = useRef(0);
  const pinchStartTyRef = useRef(0);
  const pinchMidRef = useRef({ x: 0, y: 0 });
  const pointerMovedRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const gestureEndTimeRef = useRef(0);

  const flushState = useCallback(() => {
    setScale(scaleRef.current);
    setTranslateX(txRef.current);
    setTranslateY(tyRef.current);
  }, []);

  const clampTranslate = useCallback(
    (tx: number, ty: number, s: number) => {
      const maxTx = dims.w * (s - 1) / 2 + dims.w * 0.3;
      const maxTy = dims.h * (s - 1) / 2 + dims.h * 0.3;
      return {
        tx: clamp(tx, -maxTx, maxTx),
        ty: clamp(ty, -maxTy, maxTy),
      };
    },
    [dims.w, dims.h],
  );

  const applyZoom = useCallback(
    (newScale: number, centerX: number, centerY: number) => {
      const oldScale = scaleRef.current;
      const clamped = clamp(newScale, minScale, maxScale);
      // Content point under the zoom center
      const contentX = (centerX - txRef.current) / oldScale;
      const contentY = (centerY - tyRef.current) / oldScale;
      // New translate to keep that point under the center
      const rawTx = centerX - contentX * clamped;
      const rawTy = centerY - contentY * clamped;
      const { tx, ty } = clampTranslate(rawTx, rawTy, clamped);

      scaleRef.current = clamped;
      txRef.current = tx;
      tyRef.current = ty;
      flushState();
    },
    [minScale, maxScale, clampTranslate, flushState],
  );

  const resetZoom = useCallback(() => {
    setIsResetting(true);
    const s = initialScaleRef.current;
    scaleRef.current = s;
    // Center the zoom so the middle of the container stays in view
    txRef.current = -dims.w * (s - 1) / 2;
    tyRef.current = -dims.h * (s - 1) / 2;
    flushState();
    setTimeout(() => setIsResetting(false), 300);
  }, [dims.w, dims.h, flushState]);

  // Step the zoom one notch up/down, anchored on the container centre, so the
  // visible +/- buttons feel like the wheel/pinch. Uses applyZoom so the same
  // clamping (incl. zoom-OUT below 1 when minScale < 1) and centring apply.
  const zoomIn = useCallback(() => {
    applyZoom(scaleRef.current * 1.3, dims.w / 2, dims.h / 2);
  }, [applyZoom, dims.w, dims.h]);

  const zoomOut = useCallback(() => {
    applyZoom(scaleRef.current / 1.3, dims.w / 2, dims.h / 2);
  }, [applyZoom, dims.w, dims.h]);

  const wasGesture = useCallback(() => {
    return pointerMovedRef.current > 5 || Date.now() - gestureEndTimeRef.current < 100;
  }, []);

  // Reset zoom on dims change
  useEffect(() => {
    const s = initialScaleRef.current;
    scaleRef.current = s;
    txRef.current = -dims.w * (s - 1) / 2;
    tyRef.current = -dims.h * (s - 1) / 2;
    flushState();
  }, [dims.w, dims.h, flushState]);

  // Attach event listeners
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Wheel zoom (must be non-passive to preventDefault)
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const delta = -e.deltaY * 0.002;
      applyZoom(scaleRef.current * (1 + delta), cx, cy);
    };

    // Touch events for pinch
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isPanningRef.current = false;
        pinchStartDistRef.current = getTouchDistance(e.touches[0], e.touches[1]);
        pinchStartScaleRef.current = scaleRef.current;
        pinchStartTxRef.current = txRef.current;
        pinchStartTyRef.current = tyRef.current;
        const rect = el.getBoundingClientRect();
        const mid = getTouchMidpoint(e.touches[0], e.touches[1]);
        pinchMidRef.current = { x: mid.x - rect.left, y: mid.y - rect.top };
      } else if (e.touches.length === 1 && scaleRef.current > initialScaleRef.current + 0.02) {
        // Single finger pan when zoomed
        isPanningRef.current = true;
        pointerMovedRef.current = 0;
        panStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          tx: txRef.current,
          ty: tyRef.current,
        };
      }
      // Double-tap detection
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTimeRef.current < 300 && scaleRef.current > initialScaleRef.current + 0.02) {
          resetZoom();
          lastTapTimeRef.current = 0;
        } else {
          lastTapTimeRef.current = now;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
        e.preventDefault();
        const newDist = getTouchDistance(e.touches[0], e.touches[1]);
        const ratio = newDist / pinchStartDistRef.current;
        const newScale = clamp(pinchStartScaleRef.current * ratio, minScale, maxScale);

        // Zoom toward pinch midpoint
        const contentX = (pinchMidRef.current.x - pinchStartTxRef.current) / pinchStartScaleRef.current;
        const contentY = (pinchMidRef.current.y - pinchStartTyRef.current) / pinchStartScaleRef.current;
        const rawTx = pinchMidRef.current.x - contentX * newScale;
        const rawTy = pinchMidRef.current.y - contentY * newScale;
        const { tx, ty } = clampTranslate(rawTx, rawTy, newScale);

        scaleRef.current = newScale;
        txRef.current = tx;
        tyRef.current = ty;
        flushState();
        pointerMovedRef.current = 999; // mark as gesture
      } else if (e.touches.length === 1 && isPanningRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - panStartRef.current.x;
        const dy = e.touches[0].clientY - panStartRef.current.y;
        pointerMovedRef.current = Math.max(pointerMovedRef.current, Math.hypot(dx, dy));
        const { tx, ty } = clampTranslate(
          panStartRef.current.tx + dx,
          panStartRef.current.ty + dy,
          scaleRef.current,
        );
        txRef.current = tx;
        tyRef.current = ty;
        flushState();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDistRef.current = null;
      }
      if (e.touches.length === 0) {
        if (pointerMovedRef.current > 5) {
          gestureEndTimeRef.current = Date.now();
        }
        isPanningRef.current = false;
      }
    };

    // Mouse drag for desktop pan
    const handleMouseDown = (e: MouseEvent) => {
      if (scaleRef.current <= initialScaleRef.current + 0.02) return;
      isPanningRef.current = true;
      pointerMovedRef.current = 0;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: txRef.current,
        ty: tyRef.current,
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      pointerMovedRef.current = Math.max(pointerMovedRef.current, Math.hypot(dx, dy));
      const { tx, ty } = clampTranslate(
        panStartRef.current.tx + dx,
        panStartRef.current.ty + dy,
        scaleRef.current,
      );
      txRef.current = tx;
      tyRef.current = ty;
      flushState();
    };

    const handleMouseUp = () => {
      if (isPanningRef.current && pointerMovedRef.current > 5) {
        gestureEndTimeRef.current = Date.now();
      }
      isPanningRef.current = false;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [containerRef, applyZoom, resetZoom, minScale, maxScale, clampTranslate, flushState]);

  const svgTransform = `translate(${translateX},${translateY}) scale(${scale})`;

  const domTransformStyle: CSSProperties = {
    transform: `translate(${translateX}px,${translateY}px) scale(${scale})`,
    transformOrigin: '0 0',
    transition: isResetting ? 'transform 0.3s ease-out' : undefined,
  };

  const svgToScreen = useCallback(
    (x: number, y: number) => ({
      x: x * scale + translateX,
      y: y * scale + translateY,
    }),
    [scale, translateX, translateY],
  );

  return {
    scale,
    translateX,
    translateY,
    svgTransform,
    domTransformStyle,
    svgToScreen,
    isZoomed: scale > initialScaleRef.current + 0.02,
    resetZoom,
    wasGesture,
    zoomIn,
    zoomOut,
    canFit: Math.abs(scale - initialScaleRef.current) > 0.02,
  };
}
