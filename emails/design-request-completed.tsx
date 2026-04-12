import * as React from "react"

/* eslint-disable @next/next/no-head-element -- React Email templates use raw <head> elements */

interface DesignRequestCompletedEmailProps {
  requesterName: string
  title: string
  designerName: string
  deliverableUrl: string
}

/**
 * Email template for when a design is completed (sent to requester)
 */
export function DesignRequestCompletedEmail({
  requesterName,
  title,
  designerName,
  deliverableUrl,
}: DesignRequestCompletedEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Your Design is Complete!</title>
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
                backgroundColor: "#16a34a",
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
                ✅ Your Design is Complete!
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
                Hi {requesterName},
              </p>

              <p
                style={{
                  fontSize: "16px",
                  color: "#374151",
                  lineHeight: "1.6",
                  margin: "0 0 24px",
                }}
              >
                Great news! Your design request has been completed by {designerName}.
                You can download your final files using the link below.
              </p>

              {/* Details Card */}
              <table
                role="presentation"
                style={{
                  width: "100%",
                  backgroundColor: "#dcfce7",
                  borderRadius: "8px",
                  marginBottom: "24px",
                  border: "1px solid #86efac",
                }}
              >
                <tr>
                  <td style={{ padding: "24px" }}>
                    <table role="presentation" style={{ width: "100%" }}>
                      <tr>
                        <td style={{ paddingBottom: "16px" }}>
                          <strong style={{ color: "#166534", fontSize: "12px" }}>
                            YOUR REQUEST
                          </strong>
                          <p
                            style={{
                              color: "#14532d",
                              fontSize: "16px",
                              margin: "4px 0 0",
                              fontWeight: "bold",
                            }}
                          >
                            {title}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong style={{ color: "#166534", fontSize: "12px" }}>
                            STATUS
                          </strong>
                          <p
                            style={{
                              color: "#14532d",
                              fontSize: "14px",
                              margin: "4px 0 0",
                            }}
                          >
                            ✅ Completed
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              {/* Download Button */}
              <table role="presentation" style={{ width: "100%" }}>
                <tr>
                  <td style={{ textAlign: "center" as const }}>
                    <a
                      href={deliverableUrl}
                      style={{
                        display: "inline-block",
                        backgroundColor: "#16a34a",
                        color: "#ffffff",
                        fontSize: "16px",
                        fontWeight: "bold",
                        textDecoration: "none",
                        padding: "14px 36px",
                        borderRadius: "6px",
                      }}
                    >
                      📥 Download Your Files
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
                If the button doesn&apos;t work, copy and paste this link:
                <br />
                <a href={deliverableUrl} style={{ color: "#2563eb" }}>
                  {deliverableUrl}
                </a>
              </p>

              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  lineHeight: "1.6",
                  margin: "24px 0 0",
                }}
              >
                Thank you for using Fusion for your design needs! If you need
                any minor tweaks or have questions, please contact the design team.
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
                This email was sent by Fusion.
                <br />
                You received this because you submitted a design request.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}
