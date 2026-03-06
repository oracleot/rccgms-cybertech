import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { theme } from "../styles/theme";
import { AnimatedGrid } from "../components/Card";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Insert AnimatedGrid in return

  // Staggered logo animation
  const logoProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const logoScale = interpolate(logoProgress, [0, 1], [0.5, 1]);
  const logoOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  });
  const logoRotation = interpolate(logoProgress, [0, 1], [-10, 0]);

  // Title animation with letter spacing
  const titleProgress = spring({
    frame: frame - 25,
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  const titleOpacity = interpolate(frame, [25, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);
  const titleLetterSpacing = interpolate(titleProgress, [0, 1], [20, -1]);

  // Subtitle animation
  const subtitleOpacity = interpolate(frame, [50, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleY = spring({
    frame: frame - 50,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // Icons staggered animation
  const getIconAnimation = (index: number) => {
    const delay = 80 + index * 12;
    const progress = spring({
      frame: frame - delay,
      fps,
      config: { damping: 12, stiffness: 150 },
    });
    return {
      opacity: interpolate(frame, [delay, delay + 20], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
      scale: interpolate(progress, [0, 1], [0.5, 1]),
      y: interpolate(progress, [0, 1], [30, 0]),
    };
  };

  // Floating animation for icons
  const floatOffset = Math.sin(frame * 0.05) * 3;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.colors.primary}10 0%, transparent 70%)`,
          opacity: interpolate(frame, [0, 40], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* Church Tech Logo/Icon */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale}) rotate(${logoRotation}deg)`,
          marginBottom: 48,
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: theme.borderRadius.xl,
            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, hsl(280 83% 45%) 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 20px 40px -10px ${theme.colors.primary}50`,
          }}
        >
          <svg
            width="70"
            height="70"
            viewBox="0 0 24 24"
            fill="none"
            stroke={theme.colors.primaryForeground}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M8 14h.01" />
            <path d="M12 14h.01" />
            <path d="M16 14h.01" />
            <path d="M8 18h.01" />
            <path d="M12 18h.01" />
            <path d="M16 18h.01" />
          </svg>
        </div>
      </div>

      {/* Title with gradient */}
      <h1
        style={{
          fontFamily: theme.fontFamily.sans,
          fontSize: 76,
          fontWeight: 800,
          background: `linear-gradient(135deg, ${theme.colors.foreground} 0%, ${theme.colors.primary} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          margin: 0,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          letterSpacing: titleLetterSpacing,
        }}
      >
        Rota Management
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: theme.fontFamily.sans,
          fontSize: 28,
          color: theme.colors.mutedForeground,
          marginTop: 24,
          opacity: subtitleOpacity,
          transform: `translateY(${interpolate(subtitleY, [0, 1], [20, 0])}px)`,
        }}
      >
        Schedule members for church services with ease
      </p>

      {/* Icons row with floating animation */}
      <div
        style={{
          display: "flex",
          gap: 60,
          marginTop: 80,
          transform: `translateY(${floatOffset}px)`,
        }}
      >
        {[
          { label: "View", icon: "calendar" },
          { label: "Assign", icon: "user-plus" },
          { label: "Swap", icon: "swap" },
          { label: "Notify", icon: "bell" },
        ].map((item, i) => {
          const anim = getIconAnimation(i);
          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                opacity: anim.opacity,
                transform: `scale(${anim.scale}) translateY(${anim.y}px)`,
              }}
            >
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: theme.borderRadius.lg,
                  backgroundColor: theme.colors.secondary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: theme.shadow.md,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={theme.colors.primary}
                  strokeWidth="2"
                >
                  {i === 0 && (
                    <>
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </>
                  )}
                  {i === 1 && (
                    <>
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </>
                  )}
                  {i === 2 && (
                    <>
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </>
                  )}
                  {i === 3 && (
                    <>
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </>
                  )}
                </svg>
              </div>
              <span
                style={{
                  fontFamily: theme.fontFamily.sans,
                  fontSize: 18,
                  fontWeight: 600,
                  color: theme.colors.foreground,
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
