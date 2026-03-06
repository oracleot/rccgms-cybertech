import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { theme } from "../styles/theme";
import { AnimatedGrid } from "../components/Card";
import { Button } from "../components/Button";
import { fadeIn, scaleIn } from "../utils/animations";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation with enhanced spring
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Logo animation
  const logoScale = scaleIn(frame, fps, 0);
  const logoOpacity = fadeIn(frame, 0, 20);

  // Title animation already defined above
  const titleY = spring({
    frame: frame - 15,
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  const titleTranslateY = interpolate(titleY, [0, 1], [20, 0]);

  // CTA animation
  const ctaOpacity = fadeIn(frame, 35, 20);
  const ctaScale = scaleIn(frame, fps, 35);

  // Feature badges
  const badgesOpacity = fadeIn(frame, 50, 15);

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
      <AnimatedGrid frame={frame} />
      {/* Background Pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage: `radial-gradient(${theme.colors.primary} 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: theme.borderRadius.xl,
            backgroundColor: theme.colors.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: theme.shadow.lg,
          }}
        >
          <svg
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke={theme.colors.primaryForeground}
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <polyline points="9 16 12 13 15 16" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: theme.fontFamily.sans,
          fontSize: 64,
          fontWeight: 800,
          color: theme.colors.foreground,
          margin: 0,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleTranslateY}px)`,
        }}
      >
        Ready to get started?
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: theme.fontFamily.sans,
          fontSize: 24,
          color: theme.colors.mutedForeground,
          marginTop: 16,
          opacity: titleOpacity,
        }}
      >
        Simplify your tech team scheduling today
      </p>

      {/* CTA Button */}
      <div
        style={{
          marginTop: 48,
          opacity: ctaOpacity,
          transform: `scale(${ctaScale})`,
        }}
      >
        <Button size="lg" style={{ fontSize: 22, padding: "20px 48px" }}>
          Go to Rota Dashboard
        </Button>
      </div>

      {/* Feature badges */}
      <div
        style={{
          display: "flex",
          gap: 32,
          marginTop: 56,
          opacity: badgesOpacity,
        }}
      >
        {[
          "Calendar View",
          "Easy Assignments",
          "Swap Requests",
          "Notifications",
        ].map((feature) => (
          <div
            key={feature}
            style={{
              padding: "12px 24px",
              backgroundColor: theme.colors.secondary,
              borderRadius: theme.borderRadius.full,
              fontFamily: theme.fontFamily.sans,
              fontSize: 16,
              fontWeight: 500,
              color: theme.colors.foreground,
            }}
          >
            {feature}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          fontFamily: theme.fontFamily.sans,
          fontSize: 16,
          color: theme.colors.mutedForeground,
          opacity: fadeIn(frame, 60, 15),
        }}
      >
        Cyber Tech • Church Tech Department Management
      </div>
    </AbsoluteFill>
  );
};
