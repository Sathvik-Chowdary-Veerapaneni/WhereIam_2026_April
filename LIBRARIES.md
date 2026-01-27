# MVP Library Installation Guide

## ✅ Installed Libraries

### Core Framework
- `expo@51.0.0` – Managed React Native framework
- `react@18.2.0` – React core
- `react-native@0.74.1` – React Native

### Navigation & UI
- `@react-navigation/native@6.1.10` – Navigation framework
- `@react-navigation/native-stack@6.9.16` – Stack navigation
- `react-native-screens@4.20.0` – Optimized screens for navigation
- `react-native-safe-area-context@4.8.2` – Safe area support
- `react-native-gesture-handler@2.30.0` – Gesture detection
- `react-native-reanimated@4.2.1` – Smooth animations

### Backend & Storage
- `@supabase/supabase-js@2.40.0` – Supabase client
- `expo-secure-store@13.0.1` – Encrypted key-value storage

### Analytics
- `mixpanel-react-native@3.2.1` – Event tracking & analytics

### Development
- `typescript@5.3.3` – TypeScript support
- `@types/react@18.2.45` – React types
- `@types/react-native@0.73.0` – React Native types

---

## 📦 Dependency Tree

```
debt-mirror/
├── Core
│   └── expo → react → react-native
│
├── Navigation Stack
│   ├── @react-navigation/native
│   ├── @react-navigation/native-stack
│   ├── react-native-screens (performance)
│   └── react-native-safe-area-context
│
├── Interactions & Animations
│   ├── react-native-gesture-handler
│   └── react-native-reanimated
│
├── Backend Integration
│   ├── @supabase/supabase-js
│   └── expo-secure-store
│
└── Analytics
    └── mixpanel-react-native
```

---

## 🔧 Usage Examples

### Navigation with Gesture Support
```typescript
// Automatically wired via RootNavigator
// Gestures work out of the box for back navigation
```

### Animations (when building UI)
```typescript
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

<Animated.View entering={FadeIn} exiting={FadeOut}>
  {/* Content */}
</Animated.View>
```

### Analytics with Mixpanel
```typescript
import { analyticsService } from '@/services';

// Track events
await analyticsService.trackEvent('button_pressed', { button_id: 'submit' });

// Track screens
await analyticsService.trackScreen('DashboardScreen');

// Set user properties
await analyticsService.setUserProperties(userId, { plan: 'pro' });
```

### Secure Storage
```typescript
import { secureStorage, STORAGE_KEYS } from '@/services';

await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
const token = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
```

### Supabase Client
```typescript
import { supabase, authService } from '@/services';

// Use Supabase directly for queries
const { data, error } = await supabase
  .from('debts')
  .select('*')
  .eq('user_id', userId);

// Or use auth service
const { success, user } = await authService.signIn(email, password);
```

---

## ⚠️ Environment Variables for Analytics

To use Mixpanel, add your token to `.env`:

```bash
# .env
EXPO_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-project-token
```

Then update `src/services/analytics.ts`:
```typescript
// Replace this line:
mixpanel = new Mixpanel('your-mixpanel-token');

// With this:
import { Config } from '../constants/config';
const token = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || '';
mixpanel = new Mixpanel(token);
```

---

## 🚀 Not Installed (For Later)

These libraries are **NOT installed** but can be added when ready:

- **Plaid** – `react-native-plaid-link-sdk` (when implementing bank linking)
- **RevenueCat** – `react-native-purchases` (when implementing subscriptions)
- **Sentry** – `@sentry/react-native` (when adding error tracking)
- **Amplitude** – `@amplitude/analytics-react-native` (alternative analytics)

---

## 📊 Package Summary

```bash
Total Dependencies: 7
Dev Dependencies: 3
Total Installed: 1220+ packages (includes transitive deps)

Size: 388MB (node_modules)
  - Not committed to git (in .gitignore)
  - Re-install with: npm install
```

---

## ✨ What's Ready to Use

✅ **Navigation** – Full stack navigation with gestures  
✅ **Auth** – Supabase sign up, sign in, sign out  
✅ **Secure Storage** – Encrypted token/data storage  
✅ **Analytics** – Mixpanel event tracking (console fallback)  
✅ **Animations** – Smooth transitions with Reanimated  
✅ **Type Safety** – Full TypeScript support  

---

## 🔄 Adding More Libraries

To add a new library:
```bash
npm install package-name
```

Then either:
1. **Create a new service** in `src/services/`
2. **Import and use** in components via the service layer

Example:
```bash
npm install @react-native-async-storage/async-storage
```

Then wrap it in a service for consistent API across the app.

---

## 🐛 Troubleshooting

### Port already in use
```bash
expo start -c  # Clear cache and restart
```

### Gesture handler not working
- Ensure `react-native-gesture-handler` is imported at the top of `App.tsx` (already done)

### Animations stuttering
- Expo Go has performance limitations
- Build an EAS build for better performance

### Mixpanel not tracking
- Check `EXPO_PUBLIC_ANALYTICS_ENABLED=true` in `.env`
- Verify `EXPO_PUBLIC_MIXPANEL_TOKEN` is set
- Check console logs for errors
