# 🔒 CRITICAL SECURITY FIX - DEPLOYMENT GUIDE

## ⚠️ PROBLEM IDENTIFIED

Your Supabase database has **CRITICAL security vulnerabilities**:

1. **Password Exposure** - `users` table with plain text passwords is publicly accessible
2. **No RLS Protection** - All tables have Row Level Security disabled
3. **Data Exposure Risk** - Sensitive data can be accessed by anyone with your API keys

## ✅ SOLUTION IMPLEMENTED

### Files Created/Modified:

1. **`supabase-security-fix.sql`** - Enables RLS and creates security policies
2. **`supabase-password-hash-migration.sql`** - Hashes existing plaintext passwords
2. **`supabase/functions/authenticate/index.ts`** - New secure login Edge Function
3. **`supabase/functions/reset-password/index.ts`** - Admin-only password reset Edge Function
3. **`src/pages/Login.jsx`** - Updated to use secure authentication
4. **`supabase/functions/send-bulk-emails/index.ts`** - Already fixed with rate limiting

## 📋 DEPLOYMENT STEPS (MUST FOLLOW IN ORDER!)

### Step 1: Deploy Edge Functions

```bash
npx supabase functions deploy authenticate
npx supabase functions deploy reset-password
```

This creates secure endpoints for login and admin password resets without exposing the users table.

### Step 2: Run Password Hash Migration (HIGH PRIORITY)

Open Supabase SQL Editor and run:
```
supabase-password-hash-migration.sql
```

This converts existing plaintext passwords to bcrypt hashes.

### Step 3: Test Login Still Works (BEFORE enabling RLS)

1. Open your app: http://localhost:5173
2. Try logging in with: `admin` / `admin`
3. Verify it works ✅

**Why test now?** If login fails, we can debug before enabling RLS.

### Step 4: Enable RLS (CRITICAL STEP)

Open Supabase SQL Editor and run the entire content of:
```
supabase-security-fix.sql
```

This will:
- ✅ Enable RLS on all tables
- ✅ Protect the `users` table (only Edge Functions can access)
- ✅ Allow current app functionality (anon key can still access other tables)

### Step 5: Test Everything

After enabling RLS, test:

- [ ] Login works (admin/admin)
- [ ] Dashboard loads
- [ ] Can view mentors
- [ ] Can view leads
- [ ] Can send emails
- [ ] Bulk email sending works

### Step 6: Verify Security is Fixed

1. Go to Supabase Dashboard → Database → Tables
2. Try to view `users` table with API - should be BLOCKED ✅
3. Check security warnings - should be resolved ✅

## 🚨 CRITICAL: What Happens After RLS is Enabled?

### ✅ WILL WORK:
- Dashboard, mentors, leads (anon key can access)
- Email sending (uses service_role key)
- Login (via Edge Function)

### ❌ WILL BE BLOCKED:
- Direct access to `users` table from browser/API
- Unauthorized access to password data

## 🔐 NEXT STEPS (Recommended but not urgent)

### 1. Change Passwords Safely (Admin)

Do not edit plaintext values directly in table rows.

Use the `reset-password` Edge Function (admin JWT required), for example:

```bash
curl -X POST "https://<PROJECT-REF>.supabase.co/functions/v1/reset-password" \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
	-d '{"username":"Sergiu","newPassword":"NewStrongPass123!"}'
```

Or from SQL Editor (manual admin operation):

```sql
update users
set password = crypt('NewStrongPass123!', gen_salt('bf', 12))
where username = 'Sergiu';
```

### 2. Migrate to Supabase Auth (Medium Priority)

Consider using Supabase's built-in authentication instead of custom:
- Better security
- Built-in session management
- No need to manage passwords

### 3. Add More Granular Policies (Low Priority)

Currently anon key can access most tables. Consider:
- Limiting based on authenticated user
- Read-only policies for certain fields
- Audit logging

## 📊 MONITORING

After deployment, monitor:
1. Supabase Dashboard → Security tab
2. Should show: **"0 Critical Issues"** ✅
3. Edge Function logs for authentication attempts

## 🆘 ROLLBACK (If Something Breaks)

If you need to rollback, run in SQL Editor:

```sql
-- WARNING: This disables security again!
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE mentori DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaduri DISABLE ROW LEVEL SECURITY;
ALTER TABLE alocari DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE clase DISABLE ROW LEVEL SECURITY;
ALTER TABLE studenti DISABLE ROW LEVEL SECURITY;
```

But this brings back the security vulnerabilities!

## ✅ VERIFICATION CHECKLIST

Before marking as complete:

- [ ] `authenticate` function deployed
- [ ] SQL security fix applied
- [ ] Login tested and working
- [ ] Dashboard fully functional
- [ ] Email sending works
- [ ] Supabase shows 0 critical security issues
- [ ] No errors in console

## 📝 NOTES

- The `users` table is now **protected** - only Edge Functions can access it
- Other tables still allow anon access (needed for current architecture)
- This is a **balanced approach** - fixes critical issue while maintaining functionality
- Full migration to Edge Functions recommended for maximum security

---

**Priority**: 🔴 CRITICAL - Deploy ASAP
**Risk**: Low (changes are backward compatible)
**Impact**: HIGH - Fixes password exposure vulnerability
