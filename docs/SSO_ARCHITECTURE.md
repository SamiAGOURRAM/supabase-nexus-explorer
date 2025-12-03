# SSO Authentication Architecture for UM6P Students

## Overview
This document outlines the architecture for implementing Single Sign-On (SSO) authentication for UM6P students through SHBM verification process.

## Requirements
- Only UM6P students with verified @um6p.ma email addresses can register
- Authentication should use UM6P's SSO system (SAML 2.0 or OAuth 2.0)
- Pre-defined list of authorized users - no open registration
- Automatic profile creation upon first SSO login

## Architecture Components

### 1. SSO Provider Integration
- **Provider**: UM6P Identity Provider (IdP)
- **Protocol**: SAML 2.0 or OAuth 2.0/OpenID Connect
- **Endpoint**: TBD by UM6P IT department

### 2. Authentication Flow
```
1. User clicks "Sign in with UM6P"
2. Redirect to UM6P SSO login page
3. User authenticates with UM6P credentials
4. UM6P IdP validates credentials
5. User redirected back to INF platform with authentication token
6. INF platform validates token
7. Check if user email is in authorized students list
8. If authorized: Create/update profile and grant access
9. If not authorized: Show "Not authorized" message
```

### 3. Database Schema Updates

#### authorized_students table
```sql
CREATE TABLE authorized_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  student_id TEXT, -- UM6P student ID
  program TEXT,
  year_of_study INTEGER,
  authorized_by UUID REFERENCES profiles(id),
  authorized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast email lookup
CREATE INDEX idx_authorized_students_email ON authorized_students(email);
CREATE INDEX idx_authorized_students_active ON authorized_students(is_active);
```

### 4. Implementation Steps

#### Phase 1: Preparation
- [ ] Contact UM6P IT department for SSO integration details
- [ ] Obtain SSO credentials (Client ID, Client Secret, endpoints)
- [ ] Create authorized_students table
- [ ] Import initial list of authorized students from SHBM

#### Phase 2: SSO Integration
- [ ] Install Supabase Auth SSO provider (or custom implementation)
- [ ] Configure SAML/OAuth settings
- [ ] Implement SSO callback handler
- [ ] Add token validation logic

#### Phase 3: Authorization Check
- [ ] Implement authorization middleware
- [ ] Check user email against authorized_students table
- [ ] Auto-create profile for authorized users
- [ ] Reject unauthorized users with appropriate message

#### Phase 4: Admin Tools
- [ ] Create admin interface to manage authorized_students list
- [ ] Bulk import functionality for student lists
- [ ] Manual add/remove individual students
- [ ] Export current authorized users list

### 5. Security Considerations
- Token expiration and refresh handling
- CSRF protection for SSO callback
- Rate limiting on SSO attempts
- Audit logging of all SSO login attempts
- Session management and timeout

### 6. User Experience
- Single button: "Sign in with UM6P"
- No manual email/password entry for students
- Automatic redirect to dashboard after successful SSO
- Clear error messages for unauthorized users
- Support contact information for access requests

### 7. Migration Strategy
- Keep existing email/password auth for companies and admins
- Students transition to SSO-only authentication
- Grace period for students to link existing accounts to SSO
- Communication plan for students about new login process

## Technical Notes

### Supabase SSO Implementation
Supabase supports SSO through:
1. **Built-in providers** (Google, Azure AD, etc.)
2. **Custom SAML 2.0 provider**
3. **Custom OAuth 2.0/OIDC provider**

For UM6P, we'll likely use option 2 or 3 depending on their IdP setup.

### Environment Variables
```env
# UM6P SSO Configuration
VITE_UMP6_SSO_ENABLED=true
VITE_UMP6_SSO_ENTITY_ID=https://sso.um6p.ma
VITE_UMP6_SSO_CALLBACK_URL=https://inf.um6p.ma/auth/callback
VITE_UMP6_SSO_CLIENT_ID=xxx
VITE_UMP6_SSO_CLIENT_SECRET=xxx
```

### Code Structure
```
src/
  auth/
    sso/
      provider.ts          # SSO provider configuration
      callback.ts          # Handle SSO callback
      validator.ts         # Token validation
      authorization.ts     # Check authorized users
  hooks/
    useSSO.ts             # SSO authentication hook
  pages/
    auth/
      SSOCallback.tsx     # SSO callback handler page
      Unauthorized.tsx    # Unauthorized access page
```

## Timeline
- **Phase 1**: 1-2 weeks (pending UM6P IT response)
- **Phase 2**: 2-3 weeks (implementation)
- **Phase 3**: 1 week (authorization logic)
- **Phase 4**: 1 week (admin tools)
- **Testing**: 2 weeks
- **Deployment**: 1 week

**Total Estimated Time**: 8-10 weeks

## Contacts
- **UM6P IT Department**: [Contact TBD]
- **SHBM Admin**: [Contact TBD]
- **Legal/GDPR**: [Contact TBD]

## References
- [Supabase SSO Documentation](https://supabase.com/docs/guides/auth/sso)
- [SAML 2.0 Specification](https://docs.oasis-open.org/security/saml/v2.0/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
