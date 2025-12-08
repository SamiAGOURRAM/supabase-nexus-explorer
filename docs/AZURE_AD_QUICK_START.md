# Azure AD SSO - Quick Configuration Guide

## What You Need

1. **Azure AD Administrator Access** - to create app registration
2. **Supabase Project Access** - to configure OAuth provider
3. **UM6P Tenant ID**: `39626157-a047-4689-87a2-6fa645cb5cb7`

---

## Quick Setup (5 Steps)

### 1️⃣ Get Supabase Callback URL

Find your Supabase project reference and note:
```
https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
```

### 2️⃣ Create Azure AD App

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click **New registration**
3. **Name**: `Supabase INF Platform`
4. **Account type**: Single tenant (UM6P only)
5. **Redirect URI**: Web → `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
6. Click **Register**

### 3️⃣ Add Permissions

1. API permissions → Add permission → Microsoft Graph → Delegated
2. Add: `openid`, `profile`, `email`, `User.Read`
3. **Grant admin consent** ✅

### 4️⃣ Create Secret

1. Certificates & secrets → New client secret
2. Description: `Supabase Auth`
3. Expires: 24 months
4. **Copy the secret value** (shown only once!)

### 5️⃣ Configure Supabase

1. Supabase Dashboard → Authentication → Providers → Azure
2. Enable the provider
3. Fill in:
   - **Client ID**: From Azure app overview
   - **Client Secret**: From step 4
   - **Tenant ID**: `39626157-a047-4689-87a2-6fa645cb5cb7`
4. Click **Save**

---

## Test It

1. Go to your app login page
2. Click **Student**
3. Click **Sign in with Microsoft**
4. Sign in with @um6p.ma email
5. ✅ You should land on student dashboard!

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Failed to initiate Azure AD login" | Configure Azure provider in Supabase (Step 5) |
| "Reply URL does not match" | Check redirect URI matches exactly in Azure AD |
| "Only @um6p.ma emails allowed" | This is correct - only UM6P students can use SSO |
| "No session found" | Clear cookies and try again |

---

## Important Notes

- ⚠️ Client secret expires - renew before expiration
- ⚠️ Never commit secrets to Git
- ✅ Only @um6p.ma emails work (security feature)
- ✅ Companies still use email/password login

---

## Full Documentation

For detailed instructions, see: `/docs/AZURE_AD_SETUP.md`

---

## Support

- Technical help: inf.um6p@um6p.ma
- Azure access: Your IT administrator
