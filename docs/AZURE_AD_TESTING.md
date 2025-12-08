# Azure AD Testing with Personal Account

## For Development/Testing Without UM6P Admin Access

If you don't have UM6P administrator access, you can create your own Azure AD tenant for testing.

---

## Create Your Own Azure AD Tenant (FREE)

### Step 1: Sign Up for Azure

1. Go to [Azure Portal](https://portal.azure.com)
2. Sign in with **any Microsoft account** (Outlook, Hotmail, Gmail, etc.)
3. You may need to verify your identity (phone number)

### Step 2: Create a New Azure AD Tenant

1. In Azure Portal, search for **"Azure Active Directory"**
2. Click **"Manage tenants"** at the top
3. Click **"+ Create"**
4. Select **"Azure Active Directory"**
5. Click **"Next: Configuration"**
6. Fill in:
   - **Organization name**: `My Test Tenant` (or any name)
   - **Initial domain name**: `mytestorg` (becomes `mytestorg.onmicrosoft.com`)
   - **Country/Region**: Your country
7. Click **"Review + create"** → **"Create"**
8. Wait a few minutes for tenant creation
9. Click **"Switch"** to your new tenant

### Step 3: Create Test Users

1. In your new tenant, go to **Users** → **All users**
2. Click **"+ New user"** → **"Create new user"**
3. Fill in:
   - **User principal name**: `teststudent@mytestorg.onmicrosoft.com`
   - **Display name**: `Test Student`
   - **Password**: Auto-generate or set custom
4. **Copy the password** - you'll need it to log in
5. Click **"Create"**
6. Repeat to create more test users if needed

### Step 4: Follow Main Setup Guide

Now follow the main Azure AD setup guide (`AZURE_AD_SETUP.md`) with these changes:

**When configuring Azure AD:**
- Use your new tenant ID (find it in Azure AD → Overview)
- Create the app registration in YOUR tenant
- Add permissions and grant consent (you're the admin!)
- Create client secret

**When configuring Supabase:**
- Use YOUR tenant ID instead of UM6P's
- Use YOUR client ID and secret

**When testing:**
- Sign in with: `teststudent@mytestorg.onmicrosoft.com`
- Use the password you set/copied

---

## Code Changes for Testing

The callback handler has been updated to accept both domains:
- `@um6p.ma` (production)
- `@yourtestorg.onmicrosoft.com` (your test domain)

**To use your own domain**, edit `/src/pages/auth/Callback.tsx`:

```typescript
const allowedDomains = ['@um6p.ma', '@YOUR-DOMAIN.onmicrosoft.com'];
```

Replace `YOUR-DOMAIN` with your actual domain name.

---

## Important Notes

⚠️ **Before Production:**
- Remove your test domain from allowed domains
- Only allow `@um6p.ma` in production
- Use the real UM6P tenant ID

✅ **Benefits of Personal Tenant:**
- Full admin control
- Unlimited testing
- No need to wait for IT approval
- Learn Azure AD configuration

❌ **Limitations:**
- Not the real UM6P directory
- Test users only
- Different tenant ID

---

## Testing Checklist

- [ ] Created Azure AD tenant
- [ ] Created test user(s)
- [ ] Created app registration
- [ ] Added Microsoft Graph permissions
- [ ] Granted admin consent
- [ ] Created client secret
- [ ] Updated allowed domains in code
- [ ] Configured Supabase with your tenant ID
- [ ] Tested sign-in with test user
- [ ] Verified profile creation

---

## Switch to Production Later

When you get UM6P admin access:

1. Create new app registration in **UM6P tenant**
2. Get new Client ID, Secret, and Tenant ID
3. Update Supabase configuration
4. Remove test domain from code
5. Test with real @um6p.ma account

---

## Cost

**Free!** Azure AD has a free tier that includes:
- 50,000 monthly active users
- Unlimited app registrations
- Basic authentication features
- Perfect for development and testing

---

## Alternative: Ask UM6P IT Department

If you prefer to use the real UM6P tenant:

**Email:** Your IT support or inf.um6p@um6p.ma

**Request:**
```
Subject: Azure AD App Registration for Student Portal

Hello,

I'm developing a student portal that needs Azure AD SSO authentication.

Could you please create an app registration with:
- Name: "INF Student Portal" or "Supabase Student Auth"
- Redirect URI: https://[my-supabase-project].supabase.co/auth/v1/callback
- Permissions: openid, profile, email, User.Read (Microsoft Graph)
- Admin consent granted

Then provide me with:
- Application (Client) ID
- Client Secret
- Tenant ID (should be: 39626157-a047-4689-87a2-6fa645cb5cb7)

Thank you!
```

They can set this up in 5-10 minutes.

---

## Summary

**For Testing NOW:**
→ Create your own Azure AD tenant (free, 10 minutes)

**For Production:**
→ Contact UM6P IT to create app in real tenant

Both approaches work - choose based on your timeline!
