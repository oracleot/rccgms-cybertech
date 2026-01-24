import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface SceneTransitionProps {
  children: React.ReactNode;
  durationInFrames: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export const SceneTransition: React.FC<SceneTransitionProps> = ({
  children,
  durationInFrames,
  fadeInDuration = 15,
  fadeOutDuration = 15,
}) => {
  const frame = useCurrentFrame();

  // Fade in at start
  const fadeIn = interpolate(frame, [0, fadeInDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Fade out at end
  const fadeOutStart = Math.max(0, durationInFrames - fadeOutDuration - 1);
  const fadeOut = interpolate(
    frame,
    [fadeOutStart, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    }
  );

  // Scale effect
  const scaleIn = interpolate(frame, [0, fadeInDuration], [0.98, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const opacity = Math.min(fadeIn, fadeOut);
  const scale = frame < fadeInDuration ? scaleIn : 1;

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        width: "100%",
        height: "100%",
      }}
    >
      {children}
    </div>
  );
};
