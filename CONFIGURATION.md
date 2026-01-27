# Configuration Guide - Debt Mirror MVP

## ✅ Current Configuration Status

### Already Configured ✓

- ✅ **Expo environment variables** – Automatic support for `EXPO_PUBLIC_*`
- ✅ **TypeScript path aliases** – Clean imports via `@/` prefix
- ✅ **Babel/Metro** – Auto-configured by Expo (no manual setup needed)
- ✅ **.env files** – `.env` and `.env.example` ready to use
- ✅ **Secret management** – `.env` in `.gitignore`, safe to commit `.env.example`

---

## 🔧 Environment Variables Explained

### How Expo Handles Environment Variables

In Expo, environment variables prefixed with `EXPO_PUBLIC_` are automatically bundled into your app:

```javascript
// Accessible directly in code
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Or via our config wrapper (recommended)
import { Config } from '@/constants/config';
const supabaseUrl = Config.supabase.url;
```

**Why `EXPO_PUBLIC_` prefix?**
- Explicitly marks what's safe to expose in the app bundle
- Prevents accidental leaking of secret keys
- Environment variables without this prefix are ignored by Expo

---

## 📋 Configuration Checklist

### Step 1: Create `.env` File
```bash
# Already exists, just needs values filled in
cp .env.example .env
```

### Step 2: Get Supabase Credentials
From your Supabase project dashboard:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### Step 3: (Optional) Get Mixpanel Token
```
EXPO_PUBLIC_MIXPANEL_TOKEN=your-token-here
EXPO_PUBLIC_ANALYTICS_ENABLED=true
```

### Step 4: (Optional) Plaid Credentials
```
EXPO_PUBLIC_PLAID_CLIENT_ID=your-client-id
EXPO_PUBLIC_PLAID_ENV=sandbox
```

### Step 5: (Optional) RevenueCat API Key
```
EXPO_PUBLIC_REVENUECAT_API_KEY=your-api-key
```

---

## 🎯 Using Environment Variables in Code

### Option 1: Direct Access (Simple)
```typescript
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
```

### Option 2: Via Config Wrapper (Recommended)
```typescript
// src/constants/config.ts - already set up!
import { Config } from '@/constants/config';

const supabaseUrl = Config.supabase.url;
const analyticsEnabled = Config.analytics.enabled;
const mixpanelToken = Config.analytics.mixpanelToken;
```

**Benefits:**
- Single source of truth
- Type-safe (TypeScript)
- Easy to mock in tests
- Centralized defaults

---

## 🧪 Test Your Configuration

### 1. Start the app
```bash
npm start
```

### 2. Check environment variables loaded
Add to `App.tsx`:
```typescript
import { Config } from '@/constants/config';

console.log('Config loaded:', Config);
// Should show all env vars, with 'your-...' placeholders still present
```

### 3. Test Supabase connection
```typescript
import { supabase } from '@/services';

// In a useEffect or button press:
const { data, error } = await supabase.auth.getSession();
if (error) console.error('Supabase error:', error);
else console.log('Connected!', data);
```

---

## 📂 File Structure - Configuration

```
debt-mirror/
├── .env                    # Your secrets (GITIGNORED)
├── .env.example            # Template (in git, safe)
├── src/
│   └── constants/
│       └── config.ts       # Config wrapper (in git)
├── tsconfig.json           # Path aliases configured
├── App.tsx                 # App entry point
└── app.json                # Expo manifest (no env needed)
```

---

## 🔐 Security Best Practices

### ✅ DO

- ✅ Use `EXPO_PUBLIC_` prefix for all client-side vars
- ✅ Keep `.env` in `.gitignore`
- ✅ Share only `.env.example` with team
- ✅ Use `expo-secure-store` for sensitive tokens at runtime
- ✅ Create a backend for sensitive operations (Plaid exchange, RevenueCat)

### ❌ DON'T

- ❌ Put service role keys in `.env` (Supabase)
- ❌ Put Stripe secret keys in `.env`
- ❌ Commit `.env` file to git
- ❌ Use hardcoded API keys in code

---

## 🚀 Local Development Workflow

### 1. Clone the repo
```bash
git clone <your-repo>
cd WhereIam_2026_April
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 4. Start development
```bash
npm start
# Choose platform: i (iOS), a (Android), w (Web)
```

### 5. Changes to `.env`
- Always restart Expo after changing `.env`
- Press `r` to reload in Expo, or restart with `npm start`

---

## 🔄 Team Collaboration

### For new team members:

1. **They clone the repo**
2. **They copy `.env.example` to `.env`**
   ```bash
   cp .env.example .env
   ```
3. **They fill in THEIR OWN Supabase/API keys**
   - Each person uses their own credentials
   - Or shared team credentials (depending on setup)
4. **They run the app**
   ```bash
   npm start
   ```

**Note:** Each `.env` is local and never committed to git.

---

## 🛠️ Advanced: Custom Environment Variables

To add a new environment variable:

### 1. Add to `.env.example`
```bash
EXPO_PUBLIC_MY_CUSTOM_VAR=default-value
```

### 2. Add to `.env`
```bash
EXPO_PUBLIC_MY_CUSTOM_VAR=actual-value
```

### 3. Update `src/constants/config.ts`
```typescript
export const Config = {
  // ... existing config
  custom: {
    myVar: process.env.EXPO_PUBLIC_MY_CUSTOM_VAR || '',
  },
};
```

### 4. Use in code
```typescript
import { Config } from '@/constants/config';
console.log(Config.custom.myVar);
```

---

## ✨ What's Configured Out of the Box

| Feature | Status | Location |
|---------|--------|----------|
| Expo env vars | ✅ | Auto (EXPO_PUBLIC_*) |
| TypeScript aliases | ✅ | tsconfig.json |
| Babel/Metro | ✅ | Auto (Expo) |
| Secret management | ✅ | .env/.gitignore |
| Config wrapper | ✅ | src/constants/config.ts |
| Supabase client | ✅ | src/services/supabase.ts |

---

## 📞 Next Steps

1. **Set up Supabase project** → See `SUPABASE_SETUP.md`
2. **Fill in `.env`** with your Supabase credentials
3. **Test connection** → `npm start` and check console
4. **Create database schema** → We'll help with SQL
5. **Start building features!**

---

## 📚 Reference

- **Expo Docs (Environment)**: https://docs.expo.dev/build-reference/variables/
- **Supabase Setup**: See `SUPABASE_SETUP.md` in this project
- **TypeScript Path Aliases**: `tsconfig.json` paths section

**Ready to start? Grab your Supabase credentials and let's go! 🚀**
