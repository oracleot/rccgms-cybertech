import { interpolate, spring, Easing } from "remotion";

export const fadeIn = (frame: number, startFrame: number, duration: number = 20) => {
  return interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

export const fadeOut = (frame: number, startFrame: number, duration: number = 20) => {
  return interpolate(frame, [startFrame, startFrame + duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

export const slideInFromRight = (
  frame: number,
  fps: number,
  startFrame: number,
  distance: number = 100
) => {
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });
  return interpolate(progress, [0, 1], [distance, 0]);
};

export const slideInFromLeft = (
  frame: number,
  fps: number,
  startFrame: number,
  distance: number = 100
) => {
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });
  return interpolate(progress, [0, 1], [-distance, 0]);
};

export const slideInFromBottom = (
  frame: number,
  fps: number,
  startFrame: number,
  distance: number = 100
) => {
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });
  return interpolate(progress, [0, 1], [distance, 0]);
};

export const scaleIn = (frame: number, fps: number, startFrame: number) => {
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: {
      damping: 12,
      stiffness: 150,
    },
  });
  return interpolate(progress, [0, 1], [0.8, 1]);
};

export const pulse = (frame: number, speed: number = 0.1) => {
  return 1 + Math.sin(frame * speed) * 0.05;
};
