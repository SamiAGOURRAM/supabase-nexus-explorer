# Azure AD Configuration Values for Supabase

## Supabase Dashboard Configuration

When enabling the Azure provider in your Supabase dashboard, use these values:

### Required Fields

1. **Application (client) ID**
   - Get this from Azure Portal → App Registrations → Your App → Overview
   - Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Example: `12345678-1234-1234-1234-123456789abc`

2. **Secret Value**
   - Get this from Azure Portal → App Registrations → Your App → Certificates & secrets → Client secrets
   - ⚠️ **IMPORTANT**: Use the **Value** column, NOT the Secret ID
   - This is only shown once when you create the secret
   - If you lost it, delete the old secret and create a new one

### Optional Fields

3. **Azure Tenant URL**
   - For UM6P: `https://login.microsoftonline.com/39626157-a047-4689-87a2-6fa645cb5cb7`
   - Format: `https://login.microsoftonline.com/{tenant-id}`
   - Leave empty to allow any Microsoft account (not recommended for your use case)

4. **Allow users without an email**
   - Keep this **unchecked** (disabled)
   - Your app requires email addresses for profile creation

### Callback URL (Read-Only)

5. **Callback URL**
   - Pre-filled by Supabase: `https://iwsrbinrafpexyarjdew.supabase.co/auth/v1/callback`
   - Copy this URL and add it to your Azure App Registration:
     - Go to Azure Portal → App Registrations → Your App → Authentication
     - Click "Add a platform" → Web
     - Paste this URL in "Redirect URIs"
     - Enable "ID tokens" and "Access tokens"
     - Save

---

## Step-by-Step Configuration

### Step 1: Get Application (client) ID from Azure
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find or create your app registration for INF Platform
4. Click on it and go to **Overview**
5. Copy the **Application (client) ID**

### Step 2: Get Secret Value from Azure
1. In the same app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description (e.g., "Supabase OAuth")
4. Set expiration (e.g., 24 months)
5. Click **Add**
6. **IMMEDIATELY** copy the **Value** (not the Secret ID)
7. ⚠️ Store this securely - it won't be shown again

### Step 3: Configure in Supabase
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Azure** and click **Enable**
5. Enter the values:
   - **Application (client) ID**: Paste from Step 1
   - **Secret Value**: Paste from Step 2
   - **Azure Tenant URL**: `https://login.microsoftonline.com/39626157-a047-4689-87a2-6fa645cb5cb7`
   - **Allow users without an email**: Leave unchecked
6. Copy the **Callback URL** shown
7. Click **Save**

### Step 4: Add Callback URL to Azure
1. Return to Azure Portal → Your App Registration
2. Go to **Authentication**
3. Click **Add a platform** → **Web**
4. In **Redirect URIs**, paste: `https://iwsrbinrafpexyarjdew.supabase.co/auth/v1/callback`
5. Under **Implicit grant and hybrid flows**, check:
   - ✅ ID tokens
   - ✅ Access tokens
6. Click **Configure** or **Save**

### Step 5: Configure API Permissions
1. In Azure Portal → Your App Registration → **API permissions**
2. Click **Add a permission** → **Microsoft Graph**
3. Select **Delegated permissions**
4. Add these permissions:
   - `openid` (required)
   - `profile` (required)
   - `email` (required)
   - `User.Read` (recommended)
5. Click **Add permissions**
6. Click **Grant admin consent for [Your Organization]** (if you have admin rights)

---

## Testing Your Configuration

Once configured, test the flow:

1. Go to your INF Platform login page: `http://localhost:5173/login`
2. Select "Student" role
3. Click "Sign in with Microsoft"
4. You should be redirected to Microsoft login
5. Sign in with your `@um6p.ma` account
6. Grant permissions if prompted
7. You should be redirected back to your app at `/student/dashboard`

## Troubleshooting

### "Invalid client secret provided"
- You may have copied the Secret ID instead of the Secret Value
- Create a new client secret and copy the Value immediately

### "Redirect URI mismatch"
- Ensure the callback URL in Azure exactly matches: `https://iwsrbinrafpexyarjdew.supabase.co/auth/v1/callback`
- Check for trailing slashes or typos

### "AADSTS700016: Application not found"
- Check that the Application (client) ID is correct
- Verify you're using the correct Azure tenant

### "Email domain not allowed"
- This error appears after successful Azure login
- Your callback handler at `/auth/callback` validates `@um6p.ma` emails
- If testing with a different domain, see `docs/AZURE_AD_TESTING.md`

---

## Security Notes

1. **Keep Secret Value secure**: Never commit it to git or share publicly
2. **Use environment variables**: Consider using Supabase secrets for sensitive values
3. **Limit tenant access**: Using the specific tenant URL restricts logins to UM6P accounts only
4. **Regular rotation**: Rotate client secrets periodically (before expiration)
5. **Monitor usage**: Check Azure AD sign-in logs for suspicious activity

---

## Quick Reference

```
Application (client) ID: [Get from Azure Portal → App Overview]
Secret Value: [Get from Azure Portal → Certificates & secrets → New secret → Value column]
Azure Tenant URL: https://login.microsoftonline.com/39626157-a047-4689-87a2-6fa645cb5cb7
Callback URL: https://iwsrbinrafpexyarjdew.supabase.co/auth/v1/callback (add to Azure)
```

---

## Next Steps

After configuration:
1. ✅ Test login flow with a real `@um6p.ma` account
2. ✅ Verify profile creation in Supabase database
3. ✅ Check student dashboard access
4. ✅ Update production environment variables
5. ✅ Document for your team
