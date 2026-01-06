# Send Company Credentials Edge Function

This Supabase Edge Function automatically sends login credentials to companies via professional email templates using Resend.

## Setup

### 1. Install Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Set the environment variable in Supabase:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### 2. Configure Email Settings

Set additional environment variables:

```bash
# Sender email (must be verified in Resend)
supabase secrets set FROM_EMAIL="noreply@yourdomain.com"

# Your site URL
supabase secrets set SITE_URL="https://nexus.um6p.ma"
```

### 3. Deploy the Function

```bash
supabase functions deploy send-company-credentials
```

## Usage

### From Frontend

```typescript
import { sendCredentialsEmailWithRetry } from '@/utils/emailService';

const emailResponse = await sendCredentialsEmailWithRetry({
  email: 'company@example.com',
  password: 'SecurePassword123',
  companyName: 'Acme Corp',
  companyCode: 'ACME2026', // optional
  eventName: 'Career Fair 2026', // optional
  adminName: 'John Admin', // optional
});

if (emailResponse.success) {
  console.log('Email sent!', emailResponse.messageId);
} else {
  console.error('Email failed:', emailResponse.error);
}
```

### Direct API Call

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/send-company-credentials \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "company@example.com",
    "password": "SecurePassword123",
    "companyName": "Acme Corp",
    "companyCode": "ACME2026",
    "eventName": "Career Fair 2026",
    "adminName": "John Admin"
  }'
```

## Email Template Features

The email includes:
- ✅ Professional design with company branding
- 📧 Company email and password in a highlighted box
- 🏢 Company code (if provided)
- 🔗 Direct login button
- ⚠️ Security warnings and best practices
- 📱 Mobile-responsive design
- 🌐 Plain text fallback for email clients

## Testing

### Test Locally

```bash
supabase functions serve send-company-credentials --env-file .env.local
```

Then test with:

```bash
curl -X POST http://localhost:54321/functions/v1/send-company-credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "companyName": "Test Company"
  }'
```

### Test in Production

After deploying, test from your app or use the Supabase dashboard:
1. Go to **Edge Functions** in Supabase dashboard
2. Select `send-company-credentials`
3. Use the **Test** tab to invoke with sample data

## Error Handling

The function handles:
- Missing required fields (400 error)
- Resend API errors (500 error with details)
- Network failures (with retry logic in frontend)

## Security

- Function validates all required fields
- Uses CORS headers for frontend access
- Credentials are only sent to specified email address
- Includes security warnings in email template
- Admin name is logged for accountability

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes | Your Resend API key |
| `FROM_EMAIL` | No | Sender email (default: noreply@um6p.ma) |
| `SITE_URL` | No | Your application URL (for login button) |

## Monitoring

View function logs:

```bash
supabase functions logs send-company-credentials
```

Or in the Supabase dashboard under **Edge Functions → send-company-credentials → Logs**

## Troubleshooting

### Email not sending

1. Check Resend API key is correct
2. Verify sender email is verified in Resend
3. Check function logs for errors
4. Ensure recipient email is valid

### Rate Limiting

Resend has rate limits:
- Free tier: 100 emails/day
- Pro tier: Higher limits

The frontend includes retry logic to handle temporary failures.

## Cost

- Supabase Edge Functions: Free tier includes 500K invocations/month
- Resend: Free tier includes 100 emails/day, 3,000 emails/month

## Support

For issues:
1. Check function logs in Supabase dashboard
2. Verify environment variables are set
3. Test with simple payload first
4. Contact support if persistent issues
