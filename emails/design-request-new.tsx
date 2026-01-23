import * as React from "react"

/* eslint-disable @next/next/no-head-element -- React Email templates use raw <head> elements */

interface DesignRequestNewEmailProps {
  title: string
  requesterName: string
  requesterEmail: string
  type: string
  priority: string
  description: string
  neededBy?: string | null
  viewUrl: string
}

/**
 * Email template for new design request notification (sent to team members)
 */
export function DesignRequestNewEmail({
  title,
  requesterName,
  requesterEmail,
  type,
  priority,
  description,
  neededBy,
  viewUrl,
}: DesignRequestNewEmailProps) {
  const formattedDeadline = neededBy
    ? new Date(neededBy).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  const priorityColors: Record<string, { bg: string; text: string }> = {
    low: { bg: "#f3f4f6", text: "#374151" },
    normal: { bg: "#dbeafe", text: "#1d4ed8" },
    medium: { bg: "#dbeafe", text: "#1d4ed8" },
    high: { bg: "#fef3c7", text: "#92400e" },
    urgent: { bg: "#fee2e2", text: "#dc2626" },
  }

  const priorityStyle = priorityColors[priority] || priorityColors.normal

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>New Design Request</title>
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
                backgroundColor: "#7c3aed",
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
                🎨 New Design Request
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
                A new design request has been submitted and is waiting to be claimed.
              </p>

              {/* Request Details Card */}
              <table
                role="presentation"
                style={{
                  width: "100%",
                  backgroundColor: "#f5f3ff",
                  borderRadius: "8px",
                  marginBottom: "24px",
                  border: "1px solid #c4b5fd",
                }}
              >
                <tr>
                  <td style={{ padding: "24px" }}>
                    <h2
                      style={{
                        color: "#5b21b6",
                        fontSize: "18px",
                        margin: "0 0 16px",
                      }}
                    >
                      {title}
                    </h2>

                    <table role="presentation" style={{ width: "100%" }}>
                      <tr>
                        <td style={{ paddingBottom: "12px" }}>
                          <strong style={{ color: "#6d28d9", fontSize: "12px" }}>
                            REQUESTED BY
                          </strong>
                          <p
                            style={{
                              color: "#4c1d95",
                              fontSize: "14px",
                              margin: "4px 0 0",
                            }}
                          >
                            {requesterName} ({requesterEmail})
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: "12px" }}>
                          <strong style={{ color: "#6d28d9", fontSize: "12px" }}>
                            TYPE
                          </strong>
                          <p
                            style={{
                              color: "#4c1d95",
                              fontSize: "14px",
                              margin: "4px 0 0",
                              textTransform: "capitalize" as const,
                            }}
                          >
                            {type.replace(/_/g, " ")}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: "12px" }}>
                          <strong style={{ color: "#6d28d9", fontSize: "12px" }}>
                            PRIORITY
                          </strong>
                          <p style={{ margin: "4px 0 0" }}>
                            <span
                              style={{
                                backgroundColor: priorityStyle.bg,
                                color: priorityStyle.text,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontWeight: "bold",
                                textTransform: "uppercase" as const,
                              }}
                            >
                              {priority}
                            </span>
                          </p>
                        </td>
                      </tr>
                      {formattedDeadline && (
                        <tr>
                          <td style={{ paddingBottom: "12px" }}>
                            <strong style={{ color: "#6d28d9", fontSize: "12px" }}>
                              NEEDED BY
                            </strong>
                            <p
                              style={{
                                color: "#4c1d95",
                                fontSize: "14px",
                                margin: "4px 0 0",
                              }}
                            >
                              {formattedDeadline}
                            </p>
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td>
                          <strong style={{ color: "#6d28d9", fontSize: "12px" }}>
                            DESCRIPTION
                          </strong>
                          <p
                            style={{
                              color: "#4c1d95",
                              fontSize: "14px",
                              margin: "4px 0 0",
                              whiteSpace: "pre-wrap" as const,
                            }}
                          >
                            {description.length > 200
                              ? `${description.substring(0, 200)}...`
                              : description}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              {/* CTA Button */}
              <table role="presentation" style={{ width: "100%" }}>
                <tr>
                  <td style={{ textAlign: "center" as const }}>
                    <a
                      href={viewUrl}
                      style={{
                        display: "inline-block",
                        backgroundColor: "#7c3aed",
                        color: "#ffffff",
                        fontSize: "16px",
                        fontWeight: "bold",
                        textDecoration: "none",
                        padding: "12px 32px",
                        borderRadius: "6px",
                      }}
                    >
                      View &amp; Claim Request
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
                This email was sent by Cyber Tech.
                <br />
                You received this because you&apos;re a member of the design team.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}
