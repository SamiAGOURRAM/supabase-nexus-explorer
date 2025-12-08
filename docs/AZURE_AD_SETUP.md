# Azure AD SSO Configuration Guide

## Overview
This guide will help you configure Microsoft Azure Active Directory (Azure AD) authentication for UM6P student login.

**Important**: Students with @um6p.ma emails will be able to sign in using their Microsoft credentials.

---

## Step 1: Configure Azure AD in Supabase Dashboard

### 1.1 Access Supabase Authentication Settings

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Providers** (in the left sidebar)
4. Scroll down and find **Azure** in the list of providers

### 1.2 Get Your Supabase Redirect URL

Before configuring Azure AD, note your Supabase callback URL:

```
https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
```

**To find YOUR-PROJECT-REF:**
- Look at your Supabase project URL
- Example: If your project URL is `https://abcdefgh123.supabase.co`, then:
  - Your redirect URL is: `https://abcdefgh123.supabase.co/auth/v1/callback`

⚠️ **Write this down - you'll need it for Azure AD configuration**

---

## Step 2: Register Application in Azure AD

### 2.1 Access Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Sign in with your UM6P administrator account
3. Navigate to **Azure Active Directory** (you can search for it in the top search bar)

> **💡 Don't have admin access?** See [Testing with Personal Account Guide](./AZURE_AD_TESTING.md) to create your own free Azure AD tenant for testing.

### 2.2 Create App Registration

1. In Azure AD, click **App registrations** in the left menu
2. Click **+ New registration**
3. Fill in the registration form:

   **Name**: `Supabase INF Platform` (or any name you prefer)
   
   **Supported account types**: Select **"Accounts in this organizational directory only (UM6P only - Single tenant)"**
   
   **Redirect URI**:
   - Platform: Select **Web** from the dropdown
   - URI: Paste your Supabase callback URL from Step 1.2
     ```
     https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
     ```

4. Click **Register**

### 2.3 Note Application Details

After registration, you'll see the **Overview** page. Note these values:

- **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID**: `39626157-a047-4689-87a2-6fa645cb5cb7` (UM6P tenant ID)

📝 **Copy these values - you'll need them for Supabase**

---

## Step 3: Configure API Permissions

1. In your app registration, click **API permissions** in the left menu
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Search for and add these permissions:
   - ✅ `openid`
   - ✅ `profile`
   - ✅ `email`
   - ✅ `User.Read`

6. Click **Add permissions**
7. ⚠️ **Important**: Click **Grant admin consent for UM6P** (requires admin rights)
8. Confirm by clicking **Yes**

---

## Step 4: Create Client Secret

1. In your app registration, click **Certificates & secrets** in the left menu
2. Under **Client secrets**, click **+ New client secret**
3. Add description: `Supabase Auth Secret`
4. Select expiration: **24 months** (recommended) or your preferred duration
5. Click **Add**
6. ⚠️ **IMPORTANT**: Copy the **Value** immediately - it will only be shown once!

📝 **Save this secret securely - you cannot view it again**

---

## Step 5: Configure Supabase Azure Provider

Now return to your Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Find **Azure** and click to expand it
3. Toggle **Enable Sign in with Azure** to ON
4. Fill in the configuration:

   **Azure OAuth Client ID**:
   ```
   Paste the Application (client) ID from Step 2.3
   ```

   **Azure OAuth Client Secret**:
   ```
   Paste the secret Value from Step 4
   ```

   **Azure Tenant ID**:
   ```
   39626157-a047-4689-87a2-6fa645cb5cb7
   ```

5. Click **Save**

---

## Step 6: Test the Integration

### 6.1 Test Sign-In Flow

1. Open your application: `http://localhost:5173` (development) or your production URL
2. Go to the **Login** page
3. Select **Student** (if not already selected)
4. You should see a **"Sign in with Microsoft"** button
5. Click the button
6. You'll be redirected to Microsoft login
7. Sign in with a **@um6p.ma** email address
8. Grant permissions if prompted
9. You should be redirected back to your app and logged in

### 6.2 Verify Profile Creation

After successful login:
- Check that you're redirected to `/student/dashboard`
- Verify your profile was created in Supabase:
  1. Go to Supabase Dashboard → **Table Editor** → **profiles**
  2. Find your user by email
  3. Confirm `role` is set to `student`

---

## Troubleshooting

### Error: "Failed to initiate Azure AD login"

**Cause**: Azure provider not configured in Supabase

**Solution**:
- Complete Step 5 to configure Azure provider in Supabase
- Make sure you clicked "Save"
- Wait a few seconds for changes to propagate

---

### Error: "AADSTS50011: The reply URL does not match"

**Cause**: Redirect URI mismatch between Azure AD and Supabase

**Solution**:
1. Check your Supabase redirect URL is exactly:
   ```
   https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
   ```
2. In Azure Portal → App Registration → **Authentication**
3. Verify the redirect URI matches exactly (no trailing slash, correct https)
4. If you have multiple environments (dev/staging/prod), add all redirect URIs

---

### Error: "Only @um6p.ma email addresses are allowed"

**Cause**: User tried to sign in with non-UM6P email

**Solution**:
- This is expected behavior
- Only emails ending with `@um6p.ma` are permitted
- The user will be automatically signed out
- Ask them to use their UM6P student email

---

### Error: "Authentication failed. No session found"

**Cause**: Session creation failed or OAuth flow interrupted

**Solution**:
1. Clear browser cookies and cache
2. Try again
3. Check Supabase logs: Dashboard → **Logs** → **Auth Logs**
4. Verify all permissions were granted in Azure AD (Step 3)

---

### Error: "Profile creation failed"

**Cause**: Database trigger didn't create student profile

**Solution**:
1. Check if `handle_new_user` trigger exists:
   - Supabase Dashboard → **Database** → **Functions**
2. Manually create profile if needed:
   ```sql
   INSERT INTO profiles (id, email, role)
   VALUES ('user-id-here', 'student@um6p.ma', 'student');
   ```
3. Check RLS policies allow profile creation

---

### Users keep getting signed out

**Cause**: Session storage issue or auth configuration

**Solution**:
1. Check browser allows cookies
2. Verify `detectSessionInUrl` is true in Supabase client config
3. Check for conflicting auth redirects

---

## Security Notes

### ✅ What's Protected

- **Email Domain Validation**: Only @um6p.ma emails can authenticate
- **Single Tenant**: Restricted to UM6P organization only
- **Client Secret**: Never exposed to frontend code
- **PKCE Flow**: Supabase uses secure OAuth 2.0 flow
- **Auto Sign-Out**: Invalid users are immediately signed out

### ⚠️ Important Security Practices

1. **Never commit secrets to Git**:
   - Client secret should only be in Supabase dashboard
   - Don't add it to environment files in your repository

2. **Rotate secrets regularly**:
   - Set client secret expiration to 24 months max
   - Renew before expiration

3. **Monitor auth logs**:
   - Check Supabase auth logs regularly
   - Look for suspicious sign-in attempts

4. **Test in staging first**:
   - Set up a test Azure AD app for development
   - Test thoroughly before production deployment

---

## Production Deployment

### Before Going Live

1. **Update Azure AD Redirect URI**:
   - Add your production domain redirect URI
   - Example: `https://your-domain.com/auth/callback`
   - Keep the Supabase callback URL too

2. **Environment Check**:
   - Verify Azure provider is configured in production Supabase project
   - Test the full OAuth flow in production

3. **DNS and SSL**:
   - Ensure your domain has valid SSL certificate
   - OAuth only works over HTTPS

### Multiple Environments

You can add redirect URIs for different environments:

**In Azure AD → App Registration → Authentication → Redirect URIs**:
```
https://abc123.supabase.co/auth/v1/callback          (Production Supabase)
https://xyz789.supabase.co/auth/v1/callback          (Staging Supabase)
```

---

## Reference Links

- [Azure AD OAuth Documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Supabase Azure Provider Docs](https://supabase.com/docs/guides/auth/social-login/auth-azure)
- [DEO UM6P Reference](https://deo.um6p.ma) - Working implementation example

---

## Support

If you encounter issues:

1. **Check Supabase Logs**: Dashboard → Logs → Auth Logs
2. **Check Azure AD Sign-in Logs**: Azure Portal → Azure AD → Sign-in logs
3. **Contact Support**:
   - Technical issues: inf.um6p@um6p.ma
   - Azure AD access: Your IT administrator

---

## Summary Checklist

Before testing, make sure you've completed:

- [ ] Created Azure AD App Registration
- [ ] Set correct redirect URI in Azure AD
- [ ] Added Microsoft Graph API permissions
- [ ] Granted admin consent for permissions
- [ ] Created client secret (and saved it securely)
- [ ] Configured Azure provider in Supabase dashboard
- [ ] Saved Supabase configuration
- [ ] Tested sign-in with @um6p.ma email
- [ ] Verified profile was created in database

If all items are checked ✅, your Azure AD SSO should be working!
