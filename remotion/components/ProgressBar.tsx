import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { theme } from "../styles/theme";

export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: "rgba(0, 0, 0, 0.1)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: theme.colors.primary,
          transition: "width 0.1s linear",
        }}
      />
    </div>
  );
};
