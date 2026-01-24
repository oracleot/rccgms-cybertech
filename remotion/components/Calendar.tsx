import React from "react";
import { theme } from "../styles/theme";

interface CalendarProps {
  selectedDates?: number[];
  highlightDate?: number;
  month?: string;
  style?: React.CSSProperties;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const Calendar: React.FC<CalendarProps> = ({
  selectedDates = [],
  highlightDate,
  month = "January 2026",
  style,
}) => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  // Offset for first day of month (Wednesday = 3)
  const offset = 3;

  return (
    <div
      style={{
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.border}`,
        padding: 28,
        ...style,
      }}
    >
      {/* Month Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontFamily: theme.fontFamily.sans,
            fontSize: 20,
            fontWeight: 700,
            color: theme.colors.foreground,
          }}
        >
          {month}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: theme.borderRadius.sm,
              border: `1px solid ${theme.colors.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: theme.colors.mutedForeground,
            }}
          >
            {"<"}
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: theme.borderRadius.sm,
              border: `1px solid ${theme.colors.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: theme.colors.mutedForeground,
            }}
          >
            {">"}
          </div>
        </div>
      </div>

      {/* Day Headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {DAYS.map((day) => (
          <div
            key={day}
            style={{
              fontFamily: theme.fontFamily.sans,
              fontSize: 14,
              fontWeight: 600,
              color: theme.colors.mutedForeground,
              textAlign: "center",
              padding: 8,
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 8,
        }}
      >
        {/* Empty cells for offset */}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const isSelected = selectedDates.includes(day);
          const isHighlighted = highlightDate === day;
          return (
            <div
              key={day}
              style={{
                width: 44,
                height: 44,
                borderRadius: theme.borderRadius.sm,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: theme.fontFamily.sans,
                fontSize: 16,
                backgroundColor: isHighlighted
                  ? theme.colors.primary
                  : isSelected
                  ? theme.colors.secondary
                  : "transparent",
                color: isHighlighted
                  ? theme.colors.primaryForeground
                  : isSelected
                  ? theme.colors.foreground
                  : theme.colors.foreground,
                fontWeight: isSelected || isHighlighted ? 600 : 400,
                border: isHighlighted
                  ? "none"
                  : isSelected
                  ? `2px solid ${theme.colors.primary}`
                  : "none",
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
};
