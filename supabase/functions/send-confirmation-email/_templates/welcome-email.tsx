import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface WelcomeEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  user_email: string
}

export const WelcomeEmail = ({
  token_hash,
  supabase_url,
  email_action_type,
  redirect_to,
  user_email,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to the MindMaker community!</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoContainer}>
          <Img
            src="https://bkyuxvschuwngtcdhsyg.supabase.co/storage/v1/object/public/pre-workshop-qr/mindmaker-logo.png"
            width="160"
            height="auto"
            alt="MindMaker Logo"
            style={logo}
          />
        </div>
        
        <Heading style={h1}>Thanks for joining the community</Heading>
        
        <div style={headshotContainer}>
          <Img
            src="https://bkyuxvschuwngtcdhsyg.supabase.co/storage/v1/object/public/pre-workshop-qr/krish-headshot.png"
            width="120"
            height="120"
            alt="Krish"
            style={headshot}
          />
        </div>
        
        <Text style={text}>
          I'm looking forward to helping you accelerate your AI leadership journey.
        </Text>
        
        <Text style={text}>
          To get started, please verify your email address by clicking the button below:
        </Text>
        
        <div style={buttonContainer}>
          <Link
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
            style={button}
          >
            Verify Email
          </Link>
        </div>
        
        <Text style={footerText}>
          If you didn't sign up for MindMaker, you can safely ignore this email.
        </Text>
        
        <Text style={footer}>
          © 2025 MindMaker. All rights reserved.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeEmail

const main = {
  backgroundColor: '#0a0a0a',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
  backgroundColor: '#1a1a1a',
  borderRadius: '8px',
}

const logoContainer = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const logo = {
  margin: '0 auto',
}

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  padding: '0',
  textAlign: 'center' as const,
}

const headshotContainer = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const headshot = {
  borderRadius: '50%',
  margin: '0 auto',
}

const text = {
  color: '#e5e5e5',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#9b87f5',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
}

const footerText = {
  color: '#a0a0a0',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '32px 0 16px',
  textAlign: 'center' as const,
}

const footer = {
  color: '#707070',
  fontSize: '12px',
  lineHeight: '18px',
  marginTop: '24px',
  textAlign: 'center' as const,
  borderTop: '1px solid #333',
  paddingTop: '20px',
}
