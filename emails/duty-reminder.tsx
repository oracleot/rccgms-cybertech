import * as React from "react"

/* eslint-disable @next/next/no-head-element */

interface DutyReminderEmailProps {
  name: string
  positionName: string
  serviceName: string
  date: string
  startTime?: string | null
  location?: string | null
  daysUntil: number
  viewUrl: string
}

/**
 * Email template for duty reminder notifications
 */
export function DutyReminderEmail({
  name,
  positionName,
  serviceName,
  date,
  startTime,
  location,
  daysUntil,
  viewUrl,
}: DutyReminderEmailProps) {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const timeText = daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Service Reminder</title>
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
                backgroundColor: "#f59e0b",
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
                ⏰ Service Reminder
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
                Hi {name},
              </p>

              <p
                style={{
                  fontSize: "16px",
                  color: "#374151",
                  lineHeight: "1.6",
                  margin: "0 0 24px",
                }}
              >
                This is a friendly reminder that you&#39;re scheduled to serve{" "}
                <strong>{timeText}</strong>:
              </p>

              {/* Details Card */}
              <table
                role="presentation"
                style={{
                  width: "100%",
                  backgroundColor: "#fffbeb",
                  borderRadius: "8px",
                  marginBottom: "24px",
                  border: "1px solid #fcd34d",
                }}
              >
                <tr>
                  <td style={{ padding: "24px" }}>
                    <table role="presentation" style={{ width: "100%" }}>
                      <tr>
                        <td style={{ paddingBottom: "12px" }}>
                          <strong style={{ color: "#92400e", fontSize: "12px" }}>
                            SERVICE
                          </strong>
                          <p
                            style={{
                              color: "#78350f",
                              fontSize: "16px",
                              margin: "4px 0 0",
                              fontWeight: "bold",
                            }}
                          >
                            {serviceName}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: "12px" }}>
                          <strong style={{ color: "#92400e", fontSize: "12px" }}>
                            YOUR ROLE
                          </strong>
                          <p
                            style={{
                              color: "#78350f",
                              fontSize: "16px",
                              margin: "4px 0 0",
                            }}
                          >
                            {positionName}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: startTime || location ? "12px" : "0" }}>
                          <strong style={{ color: "#92400e", fontSize: "12px" }}>
                            DATE
                          </strong>
                          <p
                            style={{
                              color: "#78350f",
                              fontSize: "16px",
                              margin: "4px 0 0",
                            }}
                          >
                            {formattedDate}
                          </p>
                        </td>
                      </tr>
                      {startTime && (
                        <tr>
                          <td style={{ paddingBottom: location ? "12px" : "0" }}>
                            <strong style={{ color: "#92400e", fontSize: "12px" }}>
                              TIME
                            </strong>
                            <p
                              style={{
                                color: "#78350f",
                                fontSize: "16px",
                                margin: "4px 0 0",
                              }}
                            >
                              {startTime.slice(0, 5)}
                            </p>
                          </td>
                        </tr>
                      )}
                      {location && (
                        <tr>
                          <td>
                            <strong style={{ color: "#92400e", fontSize: "12px" }}>
                              LOCATION
                            </strong>
                            <p
                              style={{
                                color: "#78350f",
                                fontSize: "16px",
                                margin: "4px 0 0",
                              }}
                            >
                              {location}
                            </p>
                          </td>
                        </tr>
                      )}
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
                        backgroundColor: "#f59e0b",
                        color: "#ffffff",
                        fontSize: "16px",
                        fontWeight: "bold",
                        textDecoration: "none",
                        padding: "12px 32px",
                        borderRadius: "6px",
                      }}
                    >
                      View Full Schedule
                    </a>
                  </td>
                </tr>
              </table>

              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  lineHeight: "1.6",
                  margin: "24px 0 0",
                  textAlign: "center" as const,
                }}
              >
                Can&#39;t make it? Request a swap through the app as soon as possible.
              </p>
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
                You can manage your notification preferences in the app settings.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}
