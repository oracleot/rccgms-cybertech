import * as React from "react"

/* eslint-disable @next/next/no-head-element -- React Email templates use raw <head> elements */

interface SwapNotificationEmailProps {
  recipientName: string
  type: "request_received" | "accepted" | "declined" | "approved" | "rejected"
  requesterName: string
  targetName?: string
  positionName: string
  serviceName: string
  originalDate: string
  swapDate?: string
  actionUrl: string
  message?: string
}

const typeConfig = {
  request_received: {
    title: "Swap Request Received",
    color: "#3b82f6",
    emoji: "🔄",
  },
  accepted: {
    title: "Swap Accepted",
    color: "#22c55e",
    emoji: "✅",
  },
  declined: {
    title: "Swap Declined",
    color: "#ef4444",
    emoji: "❌",
  },
  approved: {
    title: "Swap Approved",
    color: "#22c55e",
    emoji: "✅",
  },
  rejected: {
    title: "Swap Rejected",
    color: "#ef4444",
    emoji: "❌",
  },
}

/**
 * Email template for swap-related notifications
 */
export function SwapNotificationEmail({
  recipientName,
  type,
  requesterName,
  targetName,
  positionName,
  serviceName,
  originalDate,
  swapDate,
  actionUrl,
  message,
}: SwapNotificationEmailProps) {
  const formattedOriginalDate = new Date(originalDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const formattedSwapDate = swapDate
    ? new Date(swapDate).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null

  const config = typeConfig[type]

  const getBodyText = () => {
    switch (type) {
      case "request_received":
        return `${requesterName} has requested to swap duties with you for ${positionName} at ${serviceName}.`
      case "accepted":
        return `${targetName || "A team member"} has accepted your swap request for ${positionName} at ${serviceName}. The swap is now pending leader approval.`
      case "declined":
        return `${targetName || "A team member"} has declined your swap request for ${positionName} at ${serviceName}.`
      case "approved":
        return `Your swap request for ${positionName} at ${serviceName} has been approved by a team leader. The schedule has been updated.`
      case "rejected":
        return `Your swap request for ${positionName} at ${serviceName} has been rejected by a team leader.`
      default:
        return ""
    }
  }

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{config.title}</title>
      </head>
      <body
        style={{
          backgroundColor: "#f6f9fc",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
          padding: "40px 0",
        }}
      >
        <table
          role="presentation"
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* Header */}
          <tr>
            <td
              style={{
                backgroundColor: config.color,
                padding: "32px 40px",
                textAlign: "center" as const,
              }}
            >
              <h1
                style={{
                  color: "#ffffff",
                  fontSize: "24px",
                  fontWeight: "bold",
                  margin: "0",
                }}
              >
                {config.emoji} {config.title}
              </h1>
            </td>
          </tr>

          {/* Body */}
          <tr>
            <td style={{ padding: "40px" }}>
              <p
                style={{
                  fontSize: "16px",
                  color: "#374151",
                  lineHeight: "1.6",
                  margin: "0 0 24px",
                }}
              >
                Hi {recipientName},
              </p>

              <p
                style={{
                  fontSize: "16px",
                  color: "#374151",
                  lineHeight: "1.6",
                  margin: "0 0 24px",
                }}
              >
                {getBodyText()}
              </p>

              {/* Details Card */}
              <table
                role="presentation"
                style={{
                  width: "100%",
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                  marginBottom: "24px",
                }}
              >
                <tr>
                  <td style={{ padding: "24px" }}>
                    <table role="presentation" style={{ width: "100%" }}>
                      <tr>
                        <td style={{ paddingBottom: "12px" }}>
                          <strong style={{ color: "#6b7280", fontSize: "12px" }}>
                            ORIGINAL DATE
                          </strong>
                          <p
                            style={{
                              color: "#111827",
                              fontSize: "16px",
                              margin: "4px 0 0",
                            }}
                          >
                            {formattedOriginalDate}
                          </p>
                        </td>
                      </tr>
                      {formattedSwapDate && (
                        <tr>
                          <td style={{ paddingBottom: "12px" }}>
                            <strong style={{ color: "#6b7280", fontSize: "12px" }}>
                              SWAP DATE
                            </strong>
                            <p
                              style={{
                                color: "#111827",
                                fontSize: "16px",
                                margin: "4px 0 0",
                              }}
                            >
                              {formattedSwapDate}
                            </p>
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td>
                          <strong style={{ color: "#6b7280", fontSize: "12px" }}>
                            POSITION
                          </strong>
                          <p
                            style={{
                              color: "#111827",
                              fontSize: "16px",
                              margin: "4px 0 0",
                            }}
                          >
                            {positionName}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              {message && (
                <div
                  style={{
                    backgroundColor: "#fef3c7",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "24px",
                  }}
                >
                  <strong style={{ color: "#92400e", fontSize: "12px" }}>
                    MESSAGE
                  </strong>
                  <p
                    style={{
                      color: "#78350f",
                      fontSize: "14px",
                      margin: "8px 0 0",
                      fontStyle: "italic",
                    }}
                  >
                    &quot;{message}&quot;
                  </p>
                </div>
              )}

              {/* CTA Button */}
              <table role="presentation" style={{ width: "100%" }}>
                <tr>
                  <td style={{ textAlign: "center" as const }}>
                    <a
                      href={actionUrl}
                      style={{
                        display: "inline-block",
                        backgroundColor: config.color,
                        color: "#ffffff",
                        fontSize: "16px",
                        fontWeight: "bold",
                        textDecoration: "none",
                        padding: "12px 32px",
                        borderRadius: "6px",
                      }}
                    >
                      {type === "request_received"
                        ? "Respond to Request"
                        : "View Details"}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td
              style={{
                backgroundColor: "#f9fafb",
                padding: "24px 40px",
                textAlign: "center" as const,
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "#9ca3af",
                  margin: "0",
                }}
              >
                This email was sent by Fusion.
                <br />
                You can manage your notification preferences in the app settings.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}
