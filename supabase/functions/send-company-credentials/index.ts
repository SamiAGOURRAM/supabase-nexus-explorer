// Supabase Edge Function to send company login credentials via email
// This function uses Resend API to send professional emails

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@um6p.ma'

interface RequestBody {
  email: string
  password: string
  companyName: string
  companyCode?: string
  eventName?: string
  adminName?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      email,
      password,
      companyName,
      companyCode,
      eventName,
      adminName,
    }: RequestBody = await req.json()

    // Validate required fields
    if (!email || !password || !companyName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: email, password, or companyName',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate RESEND_API_KEY
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email service not configured',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create email HTML content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Credentials - UM6P Nexus Explorer</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 90%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                UM6P Nexus Explorer
              </h1>
              <p style="margin: 10px 0 0; color: #f0f0f0; font-size: 16px;">
                Your Account Credentials
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                Hello <strong>${companyName}</strong>,
              </p>

              ${eventName ? `
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                You have been invited to participate in <strong>${eventName}</strong>.
              </p>
              ` : ''}

              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #333333;">
                Your account has been created. Below are your login credentials:
              </p>

              <!-- Credentials Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f9fa; border-radius: 8px; border: 2px solid #e9ecef; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="display: inline-block; font-size: 14px; color: #666666; margin-bottom: 5px;">📧 Email:</span>
                          <div style="font-size: 16px; font-weight: bold; color: #333333; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 12px; border-radius: 4px; margin-top: 5px;">
                            ${email}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="display: inline-block; font-size: 14px; color: #666666; margin-bottom: 5px;">🔑 Password:</span>
                          <div style="font-size: 16px; font-weight: bold; color: #333333; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 12px; border-radius: 4px; margin-top: 5px;">
                            ${password}
                          </div>
                        </td>
                      </tr>
                      ${companyCode ? `
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="display: inline-block; font-size: 14px; color: #666666; margin-bottom: 5px;">🏢 Company Code:</span>
                          <div style="font-size: 16px; font-weight: bold; color: #333333; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 12px; border-radius: 4px; margin-top: 5px;">
                            ${companyCode}
                          </div>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${Deno.env.get('SITE_URL') || 'https://nexus.um6p.ma'}/login" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Log In Now
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px; font-size: 14px; font-weight: bold; color: #856404;">
                  ⚠️ Important Security Information:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #856404; line-height: 1.6;">
                  <li>Please change your password immediately after your first login</li>
                  <li>Do not share your credentials with anyone</li>
                  <li>Keep this email secure and delete it after changing your password</li>
                </ul>
              </div>

              <p style="margin: 0 0 10px; font-size: 14px; color: #666666; line-height: 1.6;">
                If you have any questions or need assistance, please contact our support team.
              </p>

              ${adminName ? `
              <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
                Invited by: <strong>${adminName}</strong>
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #999999;">
                This is an automated message from UM6P Nexus Explorer
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                © ${new Date().getFullYear()} UM6P. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // Create plain text version
    const textContent = `
UM6P Nexus Explorer - Your Login Credentials

Hello ${companyName},

${eventName ? `You have been invited to participate in ${eventName}.` : ''}

Your account has been created. Below are your login credentials:

📧 Email: ${email}
🔑 Password: ${password}
${companyCode ? `🏢 Company Code: ${companyCode}` : ''}

Login URL: ${Deno.env.get('SITE_URL') || 'https://nexus.um6p.ma'}/login

⚠️ IMPORTANT SECURITY INFORMATION:
- Please change your password immediately after your first login
- Do not share your credentials with anyone
- Keep this email secure and delete it after changing your password

If you have any questions or need assistance, please contact our support team.

${adminName ? `Invited by: ${adminName}` : ''}

---
This is an automated message from UM6P Nexus Explorer
© ${new Date().getFullYear()} UM6P. All rights reserved.
    `

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `Your Login Credentials - UM6P Nexus Explorer${eventName ? ` - ${eventName}` : ''}`,
        html: htmlContent,
        text: textContent,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send email',
          details: resendData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Email sent successfully:', resendData)

    return new Response(
      JSON.stringify({
        success: true,
        messageId: resendData.id,
        message: 'Credentials email sent successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in send-company-credentials function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
