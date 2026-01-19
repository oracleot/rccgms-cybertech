import * as React from "react"

/* eslint-disable @next/next/no-head-element */

interface RotaAssignmentEmailProps {
  name: string
  positionName: string
  serviceName: string
  date: string
  startTime?: string | null
  location?: string | null
  confirmUrl: string
}

/**
 * Email template for rota assignment notifications
 * 
 * This is a React Email template that can be rendered to HTML
 * using the `render` function from @react-email/render
 */
export function RotaAssignmentEmail({
  name,
  positionName,
  serviceName,
  date,
  startTime,
  location,
  confirmUrl,
}: RotaAssignmentEmailProps) {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Service Assignment</title>
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
                backgroundColor: "#3b82f6",
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
                Service Assignment
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
                You have been assigned to serve on the tech team. Here are the details:
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
                            SERVICE
                          </strong>
                          <p
                            style={{
                              color: "#111827",
                              fontSize: "16px",
                              margin: "4px 0 0",
                            }}
                          >
                            {serviceName}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: "12px" }}>
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
                      <tr>
                        <td style={{ paddingBottom: startTime || location ? "12px" : "0" }}>
                          <strong style={{ color: "#6b7280", fontSize: "12px" }}>
                            DATE
                          </strong>
                          <p
                            style={{
                              color: "#111827",
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
                            <strong style={{ color: "#6b7280", fontSize: "12px" }}>
                              TIME
                            </strong>
                            <p
                              style={{
                                color: "#111827",
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
                            <strong style={{ color: "#6b7280", fontSize: "12px" }}>
                              LOCATION
                            </strong>
                            <p
                              style={{
                                color: "#111827",
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
                      href={confirmUrl}
                      style={{
                        display: "inline-block",
                        backgroundColor: "#3b82f6",
                        color: "#ffffff",
                        fontSize: "16px",
                        fontWeight: "bold",
                        textDecoration: "none",
                        padding: "12px 32px",
                        borderRadius: "6px",
                      }}
                    >
                      View Schedule
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
                If you have any conflicts, please request a swap through the app.
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
