# Company Invitation with Login Credentials

## Overview

When inviting companies to events, the system now automatically creates accounts with default passwords and displays the credentials to the admin. This allows companies to log in immediately without waiting for email verification.

## Features

### 1. Automatic Account Creation
- When you invite a new company, an account is automatically created
- A secure random password is generated (16 characters)
- The company's profile is set up with their information

### 2. Credentials Display
- Email and default password are shown immediately after account creation
- A "Copy Credentials to Clipboard" button allows easy sharing
- Credentials are displayed in alerts for re-invitations

### 3. Multiple Invitation Points

#### Quick Invite Page (`/admin/events/:id/quick-invite`)
- **Add New Company**: Creates account with credentials displayed
- **Re-invite Existing**: Checks if account exists, creates if needed

#### Event Participants Page (`/admin/events/:id/participants`)
- **Resend Invite Button**: Generates new credentials for companies

## How to Use

### Inviting a New Company

1. Navigate to **Admin → Events → Select Event → Quick Invite**
2. Fill in company details:
   - Company Email (required)
   - Company Name (required)
   - Industry (optional)
   - Website (optional)
3. Click **⚡ Quick Invite**
4. If successful, you'll see:
   ```
   ✅ Account created successfully!
   
   📧 Email: company@example.com
   🔑 Default Password: abc123xyz456...
   
   ⚠️ Please share these credentials with the company securely.
   They should change their password after first login.
   ```
5. Click **Copy Credentials to Clipboard** button to copy
6. Share credentials with the company via secure channel (encrypted email, phone, etc.)

### Re-inviting Existing Companies

1. Go to **Quick Invite** page
2. Switch to **Re-invite Existing** tab
3. Search for the company
4. Click **Invite** button
5. System will:
   - Create account if none exists (shows credentials)
   - Inform you if account exists (company uses existing password)

### From Participants Page

1. Navigate to **Admin → Events → Select Event → Participants**
2. Find the company in the list
3. Click **Send/Reset Credentials** button
4. System will attempt to create account or inform if exists
5. Credentials displayed in alert popup

## Security Considerations

### Password Generation
- 16-character secure random passwords
- Uses cryptographically secure random number generator
- Combines hex strings with timestamp for uniqueness

### Best Practices

✅ **DO:**
- Share credentials via encrypted channels (Signal, WhatsApp, encrypted email)
- Advise companies to change their password immediately after first login
- Copy credentials and send them separately (don't leave them visible on screen)
- Delete credential messages after company confirms receipt

❌ **DON'T:**
- Share credentials via unencrypted email
- Share credentials via public channels (Slack public channels, etc.)
- Keep credentials in plain text notes
- Share the same credentials with multiple people

## Technical Details

### Password Utility Functions

Location: `/src/utils/passwordUtils.ts`

```typescript
// Generate secure password
generateSecurePassword(length: number = 16): string

// Copy to clipboard
copyToClipboard(text: string): Promise<boolean>

// Format credentials
formatCredentialsForClipboard(email: string, password: string): string
```

### Account Creation Flow

1. Admin invites company via UI
2. System calls `quick_invite_company()` RPC function
3. Company and profile created in database
4. Frontend generates secure password
5. `supabase.auth.signUp()` called with email and password
6. Account created in Supabase Auth
7. Credentials displayed to admin
8. Admin shares credentials with company

### Error Handling

- **Account Already Exists**: Informs admin that company should use existing credentials
- **Creation Failed**: Shows error message and suggests manual follow-up
- **Email Rate Limit**: Handled gracefully with informative message

## Future Enhancements

Potential improvements for future versions:

1. **Email Integration**: Automatically send credentials via email template
2. **SMS Integration**: Send credentials via SMS for immediate delivery
3. **Credential History**: Log when credentials were sent (for audit)
4. **Password Rotation**: Allow admin to reset passwords periodically
5. **Multi-factor Authentication**: Add MFA requirement for company logins
6. **Temporary Passwords**: Set expiration on default passwords

## Troubleshooting

### Company Can't Login

**Problem**: Company says credentials don't work

**Solutions**:
1. Check if you copied the correct credentials
2. Verify email address is exactly correct (no extra spaces)
3. Check if company already had an account (they should use old password)
4. Try generating new credentials via "Resend Invite" button

### Credentials Not Displayed

**Problem**: Success message shown but no credentials

**Solutions**:
1. Check if company already existed (no new account needed)
2. Look for error messages in the alert
3. Check browser console for errors
4. Verify company email is valid

### Copy Button Not Working

**Problem**: "Copy to Clipboard" button doesn't work

**Solutions**:
1. Ensure browser supports clipboard API
2. Try manually selecting and copying the credentials
3. Check if HTTPS is enabled (clipboard API requires secure context)
4. Use browser's developer tools to check for errors

## Support

For issues or questions about this feature:
1. Check this documentation first
2. Review error messages carefully
3. Check browser console for technical errors
4. Contact development team with specific error details
