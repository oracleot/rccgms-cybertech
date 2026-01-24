import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  interpolate,
} from "remotion";
import { theme } from "../styles/theme";
import { IntroScene } from "../scenes/IntroScene";
import { CalendarScene } from "../scenes/CalendarScene";
import { ProgressBar } from "../components/ProgressBar";
import { SceneTransition } from "../components/SceneTransition";
import { OutroScene } from "../scenes/OutroScene";
import { AssignmentScene } from "../scenes/AssignmentScene";
import { SwapRequestScene } from "../scenes/SwapRequestScene";
import { NotificationsScene } from "../scenes/NotificationsScene";

// Scene timing (47 seconds total at 30fps = 1410 frames)
// Target audience: 20-45 years, ~150 WPM comfortable pace
const SCENES = {
  intro: { start: 0, duration: 210 },          // 7 seconds
  calendar: { start: 210, duration: 240 },     // 8 seconds
  assignment: { start: 450, duration: 300 },   // 10 seconds
  swap: { start: 750, duration: 270 },         // 9 seconds
  notifications: { start: 1020, duration: 210 }, // 7 seconds
  outro: { start: 1230, duration: 180 },       // 6 seconds
};

export const RotaOnboarding: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.background,
        fontFamily: theme.fontFamily.sans,
      }}
    >
      {/* Subtle animated background gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(
              ellipse 80% 50% at 50% -20%,
              rgba(139, 92, 246, 0.08) 0%,
              transparent 50%
            )
          `,
          opacity: interpolate(frame, [0, 60], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* Scene 1: Introduction (7 seconds) */}
      <Sequence from={SCENES.intro.start} durationInFrames={SCENES.intro.duration}>
        <SceneTransition durationInFrames={SCENES.intro.duration}>
          <IntroScene />
        </SceneTransition>
      </Sequence>

      {/* Scene 2: Calendar View (8 seconds) */}
      <Sequence from={SCENES.calendar.start} durationInFrames={SCENES.calendar.duration}>
        <SceneTransition durationInFrames={SCENES.calendar.duration}>
          <CalendarScene />
        </SceneTransition>
      </Sequence>

      {/* Scene 3: Assignment (10 seconds) */}
      <Sequence from={SCENES.assignment.start} durationInFrames={SCENES.assignment.duration}>
        <SceneTransition durationInFrames={SCENES.assignment.duration}>
          <AssignmentScene />
        </SceneTransition>
      </Sequence>

      {/* Scene 4: Swap Request (9 seconds) */}
      <Sequence from={SCENES.swap.start} durationInFrames={SCENES.swap.duration}>
        <SceneTransition durationInFrames={SCENES.swap.duration}>
          <SwapRequestScene />
        </SceneTransition>
      </Sequence>

      {/* Scene 5: Notifications (7 seconds) */}
      <Sequence from={SCENES.notifications.start} durationInFrames={SCENES.notifications.duration}>
        <SceneTransition durationInFrames={SCENES.notifications.duration}>
          <NotificationsScene />
        </SceneTransition>
      </Sequence>

      {/* Scene 6: Outro (6 seconds) */}
      <Sequence from={SCENES.outro.start} durationInFrames={SCENES.outro.duration}>
        <SceneTransition durationInFrames={SCENES.outro.duration} fadeOutDuration={0}>
          <OutroScene />
        </SceneTransition>
      </Sequence>

      {/* Progress Bar */}
      <ProgressBar />
    </AbsoluteFill>
  );
};
