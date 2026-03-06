import React from "react";
import { theme } from "../styles/theme";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "default",
  size = "md",
  style,
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case "secondary":
        return {
          backgroundColor: theme.colors.secondary,
          color: theme.colors.secondaryForeground,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          color: theme.colors.foreground,
          border: `1px solid ${theme.colors.border}`,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          color: theme.colors.foreground,
        };
      case "destructive":
        return {
          backgroundColor: theme.colors.destructive,
          color: theme.colors.destructiveForeground,
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          color: theme.colors.primaryForeground,
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case "sm":
        return { padding: "6px 12px", fontSize: 14 };
      case "lg":
        return { padding: "14px 28px", fontSize: 18 };
      default:
        return { padding: "10px 20px", fontSize: 16 };
    }
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.borderRadius.md,
        fontFamily: theme.fontFamily.sans,
        fontWeight: 500,
        cursor: "pointer",
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
    >
      {children}
    </div>
  );
};
