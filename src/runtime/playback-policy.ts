import type { MotionSpec } from '../generator/motion-spec.ts';

export interface PlaybackEnvironment {
  inView: boolean;
  reducedMotion: boolean;
  active?: boolean;
}

export interface PlaybackPolicy {
  mode: 'play' | 'pause' | 'poster';
  loop: boolean;
  posterFrame: number;
}

export function resolvePlaybackPolicy(spec: MotionSpec, environment: PlaybackEnvironment): PlaybackPolicy {
  if (environment.reducedMotion) {
    return { mode: 'poster', loop: false, posterFrame: spec.reducedMotion.posterFrame };
  }

  const runtimeActive = ['autoplay', 'in-view'].includes(spec.trigger)
    ? environment.inView
    : Boolean(environment.active) && environment.inView;

  return {
    mode: runtimeActive ? 'play' : 'pause',
    loop: spec.loopStrategy !== 'none',
    posterFrame: spec.reducedMotion.posterFrame,
  };
}
