import { useEffect, useMemo, useRef, useState } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import type { MotionSpec } from '../generator/motion-spec.ts';
import { resolvePlaybackPolicy } from '../runtime/playback-policy.ts';

export interface ProductionLottieProps {
  animationData: Record<string, unknown>;
  motionSpec: MotionSpec;
  active?: boolean;
  className?: string;
  label?: string;
}

/** Runtime-safe player: in-view pausing and reduced-motion posters are automatic. */
export function ProductionLottie({ animationData, motionSpec, active, className, label }: ProductionLottieProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const policy = resolvePlaybackPolicy(motionSpec, { inView, reducedMotion, active });
  const accessibleLabel = useMemo(
    () => label ?? motionSpec.semanticRoles.map((role) => role.label).join(' to '),
    [label, motionSpec.semanticRoles],
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '100px', threshold: 0.05 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const player = lottieRef.current;
    if (!player) return;
    if (policy.mode === 'poster') {
      const frameCount = Number(animationData.op ?? 0) - Number(animationData.ip ?? 0);
      player.goToAndStop(Math.max(0, Math.floor(frameCount * policy.posterFrame)), true);
    } else if (policy.mode === 'play') {
      player.play();
    } else {
      player.pause();
    }
  }, [animationData, policy.mode, policy.posterFrame]);

  return (
    <div ref={containerRef} className={className} role="img" aria-label={accessibleLabel}>
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        autoplay={false}
        loop={policy.loop}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
