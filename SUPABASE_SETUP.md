# Supabase Setup Checklist for Debt Mirror

## ✅ What You Need to Get From Supabase

### 1. **Create a Supabase Project**
- Go to [supabase.com](https://supabase.com)
- Create a new project (select your region)
- Wait for project to initialize (~1 min)

### 2. **Get Your Credentials** 📋

Once your project is created, you'll find these in **Settings → API**:

#### **REQUIRED** (Add to .env)
```
EXPO_PUBLIC_SUPABASE_URL = [Project URL]
EXPO_PUBLIC_SUPABASE_ANON_KEY = [Anon Public Key]
```

**Where to find them:**
1. Go to your Supabase Dashboard
2. Click Settings (gear icon)
3. Click "API" in the left sidebar
4. Copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **Anon public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 📝 Fill in Your `.env` File

Once you have the credentials, update `.env` in the project root:

```bash
# .env (don't commit this!)

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Analytics (Mixpanel)
EXPO_PUBLIC_ANALYTICS_ENABLED=true
EXPO_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-project-token

# Plaid (optional - for MVP)
EXPO_PUBLIC_PLAID_CLIENT_ID=your-plaid-client-id
EXPO_PUBLIC_PLAID_ENV=sandbox

# RevenueCat (optional - for MVP)
EXPO_PUBLIC_REVENUECAT_API_KEY=your-revenuecat-api-key
```

---

## 🔒 Important Security Notes

⚠️ **Never commit `.env` to git!**
- It's already in `.gitignore`
- Only `.env.example` is committed (as template)
- Team members will copy `.env.example` → `.env` and fill in their own secrets

✅ **Anon public key is safe**
- It's designed to be public
- Controls Row-Level Security (RLS) policies
- Pair with database security rules

❌ **Service role key is secret**
- NEVER put in `.env` 
- Keep only on backend/admin

---

## 🗄️ Next: Create Database Schema

After adding credentials, you'll want to create:

### Tables for Debt Mirror MVP

**Option 1: Use Supabase Dashboard UI**
1. Go to **SQL Editor** in your Supabase Dashboard
2. Create tables for:
   - `users` (extended profile data)
   - `debts` (debt records)
   - `accounts` (linked bank accounts)
   - `transactions` (debt payments)

**Option 2: Run SQL Scripts (Recommended)**

We can provide SQL files to:
- Create tables
- Set up Row-Level Security (RLS)
- Create indexes for performance

---

## ✅ Configuration Checklist

- [ ] Create Supabase project
- [ ] Copy `EXPO_PUBLIC_SUPABASE_URL` to `.env`
- [ ] Copy `EXPO_PUBLIC_SUPABASE_ANON_KEY` to `.env`
- [ ] (Optional) Set up Mixpanel token
- [ ] Test connection: `npm start`
- [ ] Check console for any auth errors

---

## 🧪 Test Your Setup

Run this in the app (we'll add a test screen):

```typescript
import { supabase, authService } from '@/services';

// Test 1: Check connection
const { data, error } = await supabase.auth.getSession();
console.log('Supabase connected:', !error);

// Test 2: Create a test user
const { data: user, error: signupError } = await authService.signUp(
  'test@example.com', 
  'testpassword123'
);
console.log('Auth works:', !signupError);
```

---

## 📞 Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **API Reference**: https://supabase.com/docs/reference/javascript
- **Row-Level Security**: https://supabase.com/docs/guides/auth/row-level-security

---

## 🚀 What's Already Configured

✅ **Expo environment variables** – EXPO_PUBLIC_* automatically available  
✅ **TypeScript path aliases** – `@/services`, `@/screens`, etc.  
✅ **Supabase client** – Ready in `src/services/supabase.ts`  
✅ **Auth service** – Sign up/in/out wired to Supabase  
✅ **Secure storage** – Tokens encrypted with `expo-secure-store`  

---

## 📋 Your Action Items

1. **Get Supabase credentials** (URL + Anon Key)
2. **Update `.env`** file with those values
3. **Tell us when ready** → We'll help with:
   - Database schema setup
   - Authentication flow
   - Testing the connection

**Once you have the Supabase credentials, just paste them here and we'll continue!**
