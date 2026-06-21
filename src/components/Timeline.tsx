import { useCallback, useRef } from 'react';

interface TimelineProps {
  currentFrame: number;
  totalFrames: number;
  fps: number;
  onSeek: (frame: number) => void;
}

export function Timeline({ currentFrame, totalFrames, fps, onSeek }: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const progress = totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;
  const timeSeconds = totalFrames > 0 ? (currentFrame / fps).toFixed(2) : '0.00';
  const totalSeconds = totalFrames > 0 ? (totalFrames / fps).toFixed(2) : '0.00';

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current || totalFrames === 0) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      onSeek(Math.round(pct * totalFrames));
    },
    [totalFrames, onSeek],
  );

  return (
    <div className="timeline">
      <div className="timeline-bar" ref={trackRef} onClick={handleClick}>
        <div className="timeline-progress" style={{ width: `${progress}%` }} />
        <div className="timeline-head" style={{ left: `${progress}%` }} />
      </div>
      <div className="timeline-labels">
        <span>{timeSeconds}s</span>
        <span>{fps} fps</span>
        <span>{totalSeconds}s</span>
      </div>
    </div>
  );
}
