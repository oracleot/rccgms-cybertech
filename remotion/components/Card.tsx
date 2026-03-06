import React from "react";
import { theme } from "../styles/theme";

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  return (
    <div
      style={{
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadow.md,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Animated Grid Background Component  
export const AnimatedGrid: React.FC<{
  frame: number;
  color?: string;
  opacity?: number;
  cellSize?: number;
}> = ({ frame, color = "hsl(262 83% 58%)", opacity = 0.08, cellSize = 60 }) => {
  const offset = (frame * 0.15) % cellSize;
  const pulseOpacity = opacity + Math.sin(frame * 0.02) * 0.02;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", top: -offset, left: -offset, width: `calc(100% + ${cellSize}px)`, height: `calc(100% + ${cellSize}px)` }}>
        <defs>
          <pattern id="grid" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
            <path d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`} fill="none" stroke={color} strokeWidth="1" opacity={pulseOpacity} />
          </pattern>
          <radialGradient id="gridFade" cx="50%" cy="50%" r="70%"><stop offset="0%" stopColor="white" stopOpacity="1" /><stop offset="100%" stopColor="white" stopOpacity="0" /></radialGradient>
          <mask id="gridMask"><rect width="100%" height="100%" fill="url(#gridFade)" /></mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" mask="url(#gridMask)" />
      </svg>
      <svg width="100%" height="100%" style={{ position: "absolute", top: -offset, left: -offset, width: `calc(100% + ${cellSize}px)`, height: `calc(100% + ${cellSize}px)` }}>
        <defs><pattern id="dots" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="2" fill={color} opacity={pulseOpacity * 1.5} /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#dots)" mask="url(#gridMask)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 20%, ${color}08 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, ${color}05 0%, transparent 40%)` }} />
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, style }) => {
  return (
    <div
      style={{
        padding: "24px 24px 12px 24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const CardTitle: React.FC<CardProps> = ({ children, style }) => {
  return (
    <h3
      style={{
        fontFamily: theme.fontFamily.sans,
        fontSize: 20,
        fontWeight: 600,
        color: theme.colors.cardForeground,
        margin: 0,
        ...style,
      }}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<CardProps> = ({ children, style }) => {
  return (
    <p
      style={{
        fontFamily: theme.fontFamily.sans,
        fontSize: 14,
        color: theme.colors.mutedForeground,
        margin: "4px 0 0 0",
        ...style,
      }}
    >
      {children}
    </p>
  );
};

export const CardContent: React.FC<CardProps> = ({ children, style }) => {
  return (
    <div
      style={{
        padding: "12px 24px 24px 24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
