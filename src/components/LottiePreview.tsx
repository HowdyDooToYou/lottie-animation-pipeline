import { useCallback, useEffect, useRef, useState } from 'react';
import lottie, {
  type AnimationItem,
  type BMEnterFrameEvent,
} from 'lottie-web/build/player/lottie_light';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [isPlaying, setIsPlaying] = useState(autoplay && !reducedMotion);
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !animationData) return;

    const instance = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop,
      autoplay: false,
      animationData,
      rendererSettings: {
        progressiveLoad: true,
        preserveAspectRatio: 'xMidYMid meet',
        focusable: false,
      },
    });
    animationRef.current = instance;
    instance.setSpeed(speed);

    const handleEnterFrame = (event: BMEnterFrameEvent) => {
      const frame = Math.round(event.currentTime);
      setCurrentFrame(frame);
      onFrameChange?.(frame);
    };
    const handleLoaded = () => {
      if (autoplay && !reducedMotion) {
        instance.play();
        setIsPlaying(true);
      } else {
        instance.goToAndStop(
          Math.round(Math.max(0, instance.totalFrames - 1) * 0.52),
          true,
        );
        setIsPlaying(false);
      }
    };

    instance.addEventListener('enterFrame', handleEnterFrame);
    instance.addEventListener('DOMLoaded', handleLoaded);
    setCurrentFrame(0);

    return () => {
      instance.removeEventListener('enterFrame', handleEnterFrame);
      instance.removeEventListener('DOMLoaded', handleLoaded);
      instance.destroy();
      animationRef.current = null;
    };
  }, [animationData, autoplay, loop, onFrameChange, reducedMotion, speed]);

  useEffect(() => {
    animationRef.current?.setSpeed(speed);
  }, [speed]);

  const togglePlay = useCallback(() => {
    const instance = animationRef.current;
    if (!instance) return;
    if (isPlaying) instance.pause();
    else instance.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const restart = useCallback(() => {
    animationRef.current?.goToAndPlay(0, true);
    setIsPlaying(true);
    setCurrentFrame(0);
  }, []);

  if (!animationData) {
    return (
      <div className="lottie-preview-empty">
        <p>No motion loaded.</p>
      </div>
    );
  }

  const totalFrames = Math.max(
    0,
    Math.round(Number(animationData.op) - Number(animationData.ip ?? 0)),
  );

  return (
    <div className="lottie-preview">
      <div
        ref={containerRef}
        className="lottie-canvas"
        role="img"
        aria-label={String(animationData.nm ?? 'Animated preview')}
      />
      <div className="lottie-controls">
        <button
          onClick={togglePlay}
          className="control-button"
          type="button"
          aria-label={isPlaying ? 'Pause motion' : 'Play motion'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          onClick={restart}
          className="control-button"
          type="button"
          aria-label="Restart motion"
        >
          <RestartIcon />
        </button>
        <span className="frame-counter" aria-live="off">
          {String(currentFrame).padStart(3, '0')} / {String(totalFrames).padStart(3, '0')}
        </span>
      </div>
    </div>
  );
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function PlayIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 8 5-8 5V3Z" /></svg>;
}

function PauseIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z" /></svg>;
}

function RestartIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5V2m0 3h3M3.5 5A5.5 5.5 0 1 1 2.8 10" /></svg>;
}
