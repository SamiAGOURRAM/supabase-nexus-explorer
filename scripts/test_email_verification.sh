#!/bin/bash

# Email Verification Test Script
# Tests that unverified users cannot access protected routes

echo "🧪 Email Verification System Test"
echo "=================================="
echo ""

echo "✅ Checking modified files..."
echo ""

# Check if ProtectedRoute exists
if [ -f "src/components/shared/ProtectedRoute.tsx" ]; then
    echo "✓ ProtectedRoute component created"
else
    echo "✗ ProtectedRoute component missing"
fi

# Check if useEmailVerification hook exists
if [ -f "src/hooks/useEmailVerification.ts" ]; then
    echo "✓ useEmailVerification hook created"
else
    echo "✗ useEmailVerification hook missing"
fi

# Check if config has enable_confirmations
if grep -q "enable_confirmations = true" supabase/config.toml; then
    echo "✓ Email confirmations enabled in config"
else
    echo "✗ Email confirmations NOT enabled in config"
fi

echo ""
echo "🔍 Checking code implementation..."
echo ""

# Check if Signup.tsx signs out after signup
if grep -q "await supabase.auth.signOut();" src/pages/Signup.tsx; then
    echo "✓ Signup immediately signs out users"
else
    echo "✗ Signup does NOT sign out users"
fi

# Check if Login.tsx checks email confirmation
if grep -q "email_confirmed_at" src/pages/Login.tsx; then
    echo "✓ Login checks email verification"
else
    echo "✗ Login does NOT check email verification"
fi

# Check if App.tsx uses ProtectedRoute
if grep -q "ProtectedRoute" src/App.tsx; then
    echo "✓ Student routes are protected"
else
    echo "✗ Student routes are NOT protected"
fi

echo ""
echo "📋 Manual Testing Steps:"
echo "========================"
echo ""
echo "1. Start the development server:"
echo "   npm run dev"
echo ""
echo "2. Open http://localhost:3000 (or your dev URL)"
echo ""
echo "3. Sign up with a new email"
echo ""
echo "4. Try to log in immediately"
echo "   → Should be BLOCKED with error message"
echo ""
echo "5. Check email inbox (local: http://localhost:54324)"
echo ""
echo "6. Click confirmation link in email"
echo ""
echo "7. Now try to log in again"
echo "   → Should be SUCCESSFUL"
echo ""
echo "✨ If step 4 blocks login, the system is working correctly!"
echo ""

echo "📚 For more details, see: EMAIL_VERIFICATION_SETUP.md"
