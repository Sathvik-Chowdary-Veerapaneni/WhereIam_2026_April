# Database Schema Setup Guide

## ✅ Your Supabase Project is Ready!

Your credentials are configured:
```
Project: https://mnfazpnbjewyxhbrbkyc.supabase.co
Status: Ready to use
```

---

## 🚀 Next Step: Create Database Tables

We've created a complete SQL schema file: `DATABASE_SCHEMA.sql`

This creates:
- ✅ `profiles` – User profiles
- ✅ `accounts` – Linked bank accounts (Plaid)
- ✅ `debts` – Debt records
- ✅ `payments` – Payment history
- ✅ `transactions` – Bank transactions
- ✅ Row-Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Useful views & triggers

---

## 📋 How to Run the SQL Schema

### Option 1: Using Supabase Dashboard (Easy) ✨

1. **Log in** to your Supabase project: https://app.supabase.com
2. **Navigate** to SQL Editor (left sidebar)
3. **Click** "New Query"
4. **Copy & paste** the contents of `DATABASE_SCHEMA.sql`
5. **Click** "Run" (or Cmd+Enter)
6. **Wait** for success message (should be ~10 seconds)

### Option 2: Using Supabase CLI (Alternative)

```bash
# If you have Supabase CLI installed:
supabase db push
```

---

## ✅ What Gets Created

### Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profile info (extends Supabase Auth) |
| `accounts` | Linked bank accounts from Plaid |
| `debts` | Individual debts being tracked |
| `payments` | Payment history for each debt |
| `transactions` | Bank transactions from accounts |

### Security (Row-Level Security / RLS)
- Users can **only see their own data**
- Each user is isolated
- No one can access another user's debts/accounts
- Automatically enforced at database level

### Views (For Easy Querying)
- `debt_summary` – Overview of all debts with payment counts
- `user_financial_overview` – Total debt, paid-off count, avg interest

### Triggers
- Auto-create profile when user signs up
- Maintains data consistency

---

## 📝 Schema Details

### Profiles Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,           -- User ID from Supabase Auth
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Debts Table (Main Table)
```sql
CREATE TABLE debts (
  id UUID PRIMARY KEY,
  user_id UUID,                  -- User this debt belongs to
  account_id UUID,               -- Linked bank account (optional)
  
  name TEXT,                     -- "Credit Card", "Car Loan", etc.
  debt_type TEXT,               -- 'credit_card', 'loan', 'mortgage'
  
  principal NUMERIC,            -- Original debt amount
  current_balance NUMERIC,      -- What's left to pay
  interest_rate NUMERIC,        -- Annual %
  minimum_payment NUMERIC,
  
  status TEXT,                  -- 'active', 'paid_off', 'paused'
  priority INTEGER,             -- 0=low, 1=medium, 2=high
  
  start_date DATE,
  due_date DATE,
  target_payoff_date DATE,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Payments Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  debt_id UUID,                 -- Which debt this payment is for
  
  amount NUMERIC,               -- Payment amount
  payment_date DATE,
  payment_method TEXT,          -- 'manual', 'automatic', 'minimum'
  notes TEXT
);
```

### Accounts Table (Plaid Integration)
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  user_id UUID,
  
  plaid_account_id TEXT,        -- ID from Plaid
  account_name TEXT,
  account_type TEXT,            -- 'checking', 'savings', 'credit'
  institution_name TEXT,        -- "Chase", "Bank of America", etc.
  mask TEXT,                    -- Last 4 digits (****1234)
  
  balance_current NUMERIC,
  balance_available NUMERIC
);
```

---

## 🔒 Row-Level Security Explanation

When you run the SQL, RLS policies are automatically enabled:

```sql
-- Example: Users can only see their own debts
SELECT * FROM debts;  -- Returns only YOUR debts
-- Even if someone tries to hack, they can't see others' data
```

**Why this matters:**
- User A cannot query User B's debts
- Enforced at database level (not just in app)
- No security risk if JWT is compromised

---

## ✅ Verification Checklist

After running the SQL:

1. **Check tables were created**
   - Go to Supabase Dashboard → Tables (left sidebar)
   - Should see: `profiles`, `accounts`, `debts`, `payments`, `transactions`

2. **Check RLS is enabled**
   - Click any table
   - Go to RLS tab
   - Should show "RLS enabled" with policies listed

3. **Check indexes exist**
   - Go to SQL Editor
   - Run: `SELECT indexname FROM pg_indexes WHERE schemaname = 'public';`
   - Should see multiple indexes (good for performance)

4. **Check views created**
   - Should see `debt_summary` and `user_financial_overview` in Tables

---

## 🧪 Quick Test

After creating schema, test with this SQL:

```sql
-- This will fail (good! - RLS is working)
SELECT * FROM profiles WHERE id != auth.uid();
-- Result: 0 rows (can't see other users)

-- This will show your profile (good! - you can see your own data)
SELECT * FROM profiles WHERE id = auth.uid();
```

---

## 🐛 Troubleshooting

### "Table already exists" error
- You might have run the schema before
- Safe to run again (uses `CREATE TABLE IF NOT EXISTS`)

### "Permission denied" error
- Make sure you're logged in as project owner
- Check your role in Supabase dashboard

### RLS blocking all queries
- This is normal if not authenticated
- Make sure your app is sending the JWT token
- We'll wire this up in the app code

---

## 📞 Next Steps After Schema Creation

1. ✅ **Run DATABASE_SCHEMA.sql** in Supabase
2. ⏭️ **Test the connection** – We'll create test screen
3. ⏭️ **Build LoginScreen** – Sign up/in with Supabase
4. ⏭️ **Build DashboardScreen** – Show user's debts
5. ⏭️ **Add CRUD operations** – Create/edit debts
6. ⏭️ **Wire up Plaid** – Link bank accounts
7. ⏭️ **Add analytics** – Track user actions

---

## 📚 Reference

- **Supabase SQL Editor**: https://app.supabase.com → SQL Editor
- **RLS Documentation**: https://supabase.com/docs/guides/auth/row-level-security
- **Schema Design**: Tables, relationships, and indexes explained above

---

## 🎯 Important: Save Your Project URL & Key

Already in your `.env` file:
```
EXPO_PUBLIC_SUPABASE_URL=https://mnfazpnbjewyxhbrbkyc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

**Don't share the anon key publicly, but it's safe to put in `.env` (not exposed in bundle).**

---

**Once you run the SQL schema, let me know and we'll:**
1. Test the database connection
2. Build the auth flow
3. Start building screens!
