# Company Verification & Offer Visibility Workflow

## ✅ Complete Workflow

### 1. Admin Can Verify Companies
- **Location**: `/admin/companies`
- **Functionality**: 
  - Admins can see all companies (verified and pending)
  - Click "Verify" button to verify a company
  - Click "Unverify" button to revoke verification
  - Uses database function `fn_verify_company(company_id, is_verified)`

### 2. Verified Companies Can Create Offers
- **RLS Policy**: `"Companies can manage their own offers"`
- **Behavior**: 
  - Companies can create, edit, and manage their own offers regardless of verification status
  - However, offers are only visible to students if the company is verified

### 3. Offers Appear for Students
- **RLS Policy**: `"Public can view verified company offers"`
- **Requirements**:
  - ✅ `is_active = true` (offer must be active)
  - ✅ Company must be verified (`companies.is_verified = true`)
- **Location**: 
  - Public page: `/offers`
  - Student page: `/student/offers`

### 4. Inactive Offers Do NOT Appear
- **RLS Policy**: `"Public can view verified company offers"`
- **Filter**: `is_active = true` is required
- **Behavior**: 
  - Companies can deactivate offers (they remain in database but hidden)
  - Students cannot see inactive offers
  - Companies can reactivate offers later

## Database Policies

### Offers Table RLS Policies

1. **Public/Students**: Can view offers from verified companies
   ```sql
   CREATE POLICY "Public can view verified company offers" ON offers 
   FOR SELECT 
   USING (
       is_active = true 
       AND EXISTS (
           SELECT 1 FROM companies c 
           WHERE c.id = offers.company_id 
           AND c.is_verified = true
       )
   );
   ```

2. **Companies**: Can manage their own offers (create, update, delete)
   ```sql
   CREATE POLICY "Companies can manage their own offers" ON offers 
   FOR ALL 
   USING (
       EXISTS (
           SELECT 1 FROM companies c 
           WHERE c.id = offers.company_id 
           AND c.profile_id = auth.uid()
       )
   );
   ```

3. **Admins**: Can view all offers (verified or not, active or not)
   ```sql
   CREATE POLICY "Admins can view all offers" ON offers 
   FOR SELECT 
   USING (
       EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
   );
   ```

## Frontend Implementation

### Admin Companies Page (`/admin/companies`)
- ✅ Lists all companies
- ✅ Shows verification status (Verified/Pending)
- ✅ "Verify" button for unverified companies
- ✅ "Unverify" button for verified companies
- ✅ Calls `fn_verify_company` RPC function

### Student Offers Pages
- ✅ `/offers` - Public offers page (filters by `is_active = true`)
- ✅ `/student/offers` - Student offers page (filters by `is_active = true`)
- ✅ RLS automatically filters by company verification

### Company Offers Management
- ✅ Companies can create offers (regardless of verification)
- ✅ Companies can toggle offer active/inactive status
- ✅ Companies can edit their offers

## Testing Checklist

- [ ] Admin can verify a company
- [ ] Verified company can create offers
- [ ] Unverified company can create offers (but they won't be visible to students)
- [ ] Students can see offers from verified companies only
- [ ] Students cannot see inactive offers
- [ ] Students cannot see offers from unverified companies
- [ ] Admin can unverify a company
- [ ] After unverification, company's offers disappear from student view
- [ ] Companies can activate/deactivate their offers
- [ ] Inactive offers don't appear to students

## Notes

- **RLS is enforced at the database level**, so even if frontend code doesn't filter, the database will automatically enforce these rules
- **Companies can create offers before verification**, but they won't be visible until the company is verified
- **Offers remain in the database** when deactivated, they're just hidden from students
- **Verification is logged** in `admin_actions` table for audit trail

