# 📧 Email Verification Setup Guide

## ✅ Changes Made

The email verification system has been updated to properly send and verify OTP codes.

### 1. **Signup Flow** (`src/pages/Signup.tsx`)
- Changed from `signInWithOtp` to `signUp` for proper new user creation
- Now uses `supabase.auth.signUp()` which:
  - Creates the user account
  - Sends a 6-digit OTP code to the user's email
  - Stores user metadata (name, role, etc.) for profile creation

### 2. **Verification Flow** (`src/pages/VerifyEmail.tsx`)
- Improved OTP verification with better error handling
- Added success messages for better user feedback
- Enhanced resend functionality with fallback options
- Automatic redirect to appropriate dashboard after verification
- Profile creation is handled automatically by database triggers

### 3. **User Experience Improvements**
- Added success message display (green banner)
- Better error messages
- Helpful hints (check spam folder, code expiration)
- Improved resend code functionality

---

## 🔧 Supabase Configuration Required

**IMPORTANT:** Make sure your Supabase project is configured to send **OTP codes** instead of magic links.

### Steps to Configure:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Check the **Confirm signup** template
4. Ensure your project is set to use **OTP** (One-Time Password) mode

### Alternative: Configure in Auth Settings

1. Go to **Authentication** → **Providers** → **Email**
2. Make sure **Enable email confirmations** is ON
3. Set **Email OTP expiry** (default: 3600 seconds = 1 hour)
4. The system should send 6-digit codes automatically

---

## 📋 How It Works

### Signup Process:
1. User fills out signup form
2. `signUp()` is called with user data
3. Supabase creates user and sends 6-digit OTP code to email
4. User is redirected to verification page

### Verification Process:
1. User enters 6-digit code from email
2. `verifyOtp()` validates the code
3. If valid:
   - User session is created
   - Profile is automatically created via database trigger
   - User is redirected to their dashboard (student/company/admin)
4. If invalid:
   - Error message is shown
   - User can resend code

### Resend Code:
- User clicks "Resend verification code"
- System attempts to resend OTP via `signInWithOtp`
- If that fails, tries `resend()` method as fallback
- Success message confirms code was sent

---

## 🧪 Testing

To test the email verification:

1. **Sign up a new user:**
   - Go to `/signup`
   - Fill in the form
   - Submit

2. **Check email:**
   - Look for email from Supabase
   - Find the 6-digit code
   - Note: Check spam folder if not in inbox

3. **Verify:**
   - Enter the 6-digit code
   - Click "Verify Email"
   - Should redirect to dashboard

4. **Test resend:**
   - Click "Resend verification code"
   - Should receive new code
   - Verify with new code

---

## 🐛 Troubleshooting

### Code Not Received?
- Check spam/junk folder
- Verify email address is correct
- Check Supabase email logs in dashboard
- Ensure email provider isn't blocking Supabase emails

### "Invalid verification code" Error?
- Code may have expired (default: 1 hour)
- Code may have been used already
- Try resending a new code

### Profile Not Created?
- Check database triggers are active
- Verify `handle_new_user()` function exists
- Check Supabase logs for trigger errors

### Magic Link Instead of OTP?
- Verify Supabase project is configured for OTP
- Check Authentication settings
- May need to update email template configuration

---

## 📝 Code Changes Summary

### Files Modified:
- ✅ `src/pages/Signup.tsx` - Changed to use `signUp()`
- ✅ `src/pages/VerifyEmail.tsx` - Improved verification flow

### Key Functions:
- `supabase.auth.signUp()` - Creates user and sends OTP
- `supabase.auth.verifyOtp()` - Verifies the 6-digit code
- `supabase.auth.signInWithOtp()` - Resends OTP for existing users
- `supabase.auth.resend()` - Fallback for resending codes

---

## ✨ Features

- ✅ 6-digit OTP code verification
- ✅ Automatic profile creation
- ✅ Role-based redirect after verification
- ✅ Resend code functionality
- ✅ Success/error message display
- ✅ Helpful user guidance
- ✅ Spam folder reminder

---

*Last Updated: January 2025*

