import { useRef, useCallback, useState, useEffect } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';

interface LottiePreviewProps {
  animationData: Record<string, unknown> | null;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  onFrameChange?: (frame: number) => void;
}

export function LottiePreview({
  animationData,
  loop = true,
  autoplay = true,
  speed = 1,
  onFrameChange,
}: LottiePreviewProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Track frame changes via animation event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEnterFrame = useCallback((e?: any) => {
    if (!e || typeof e.currentTime !== 'number') return;
    const frame = Math.round(e.currentTime);
    if (frame !== currentFrame) {
      setCurrentFrame(frame);
      onFrameChange?.(frame);
    }
  }, [currentFrame, onFrameChange]);

  const togglePlay = useCallback(() => {
    if (!lottieRef.current) return;
    if (isPlaying) {
      lottieRef.current.pause();
    } else {
      lottieRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const stop = useCallback(() => {
    lottieRef.current?.stop();
    setIsPlaying(false);
    setCurrentFrame(0);
  }, []);

  // Update speed prop
  useEffect(() => {
    lottieRef.current?.setSpeed(speed);
  }, [speed]);

  if (!animationData) {
    return (
      <div className="lottie-preview-empty">
        <p>Load an animation to preview</p>
        <p className="hint">
          Drag a <code>.json</code> file into the animations panel, or use the generator.
        </p>
      </div>
    );
  }

  return (
    <div className="lottie-preview">
      <div className="lottie-canvas">
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={loop}
          autoplay={autoplay}
          onEnterFrame={handleEnterFrame}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div className="lottie-controls">
        <button onClick={togglePlay} className="control-btn">
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={stop} className="control-btn">⏹</button>
        <span className="frame-counter">
          Frame {Math.round(currentFrame)} / {Math.round((animationData.op as number) || 0)}
        </span>
      </div>
    </div>
  );
}
