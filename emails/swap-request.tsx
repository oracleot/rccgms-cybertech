import * as React from "react"
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components"

interface SwapRequestEmailProps {
  requesterName: string
  targetName: string
  serviceName: string
  serviceDate: string
  positionName: string
  reason?: string
  actionUrl: string
}

export function SwapRequestEmail({
  requesterName = "John Smith",
  targetName = "Jane Doe",
  serviceName = "Sunday Service",
  serviceDate = "Sunday, December 29, 2024",
  positionName = "Camera Operator",
  reason,
  actionUrl = "https://cybertech.church/rota/swaps",
}: SwapRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {requesterName} is requesting a duty swap with you
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Duty Swap Request</Heading>
          
          <Text style={text}>
            Hi {targetName},
          </Text>
          
          <Text style={text}>
            <strong>{requesterName}</strong> has requested to swap duties with you for an upcoming service.
          </Text>

          <Section style={infoBox}>
            <Text style={infoLabel}>Service</Text>
            <Text style={infoValue}>{serviceName}</Text>
            
            <Text style={infoLabel}>Date</Text>
            <Text style={infoValue}>{serviceDate}</Text>
            
            <Text style={infoLabel}>Position</Text>
            <Text style={infoValue}>{positionName}</Text>
            
            {reason && (
              <>
                <Text style={infoLabel}>Reason</Text>
                <Text style={infoValue}>&ldquo;{reason}&rdquo;</Text>
              </>
            )}
          </Section>

          <Text style={text}>
            If you&apos;re able to cover this duty, please accept the request. If not, you can decline.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={actionUrl}>
              View Swap Request
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            This email was sent by Cyber Tech - Church Tech Department Management.
            If you have questions, please contact your team leader.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SwapRequestEmail

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
}

const heading = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  textAlign: "center" as const,
  margin: "0 0 24px",
}

const text = {
  color: "#525252",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
}

const infoBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
}

const infoLabel = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px",
}

const infoValue = {
  color: "#1a1a1a",
  fontSize: "16px",
  fontWeight: "500",
  margin: "0 0 16px",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
}

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
}

const footer = {
  color: "#9ca3af",
  fontSize: "14px",
  lineHeight: "20px",
  textAlign: "center" as const,
}
