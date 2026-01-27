# Debt Mirror MVP

Cross-platform React Native app (Expo managed workflow) for debt tracking with Supabase backend integration.

## Tech Stack

- **React Native 0.74** with Expo 51 (managed workflow)
- **TypeScript** for type safety
- **React Navigation 6** with native stack navigation
- **Supabase** for backend/auth
- **Expo Secure Store** for encrypted local storage
- **Mixpanel** for analytics (with console fallback)
- **React Native Reanimated** for smooth animations
- **React Native Gesture Handler** for gesture support
- **RevenueCat** (placeholder for subscriptions)
- **Plaid** (placeholder for bank account linking)

## Project Structure

```
debt-mirror/
├── src/
│   ├── screens/          # App screens
│   ├── components/       # Reusable components
│   ├── services/         # Business logic (Supabase, Plaid, RevenueCat, Analytics)
│   ├── utils/            # Helper functions (logger, etc.)
│   ├── navigation/       # Navigation setup & types
│   ├── constants/        # Config, constants
│   └── assets/           # Images, fonts, etc.
├── App.tsx               # App entry point
├── app.json              # Expo config
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── .env                  # Environment variables (not committed)
└── .env.example          # Template for .env
```

## Setup Instructions

### 1. Prerequisites
- Node.js 16+ and npm
- iOS: Xcode 14+ (for building on iOS)
- Android: Android Studio + Android SDK (for building on Android)
- Expo CLI: `npm install -g expo-cli`

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Required:
- `EXPO_PUBLIC_SUPABASE_URL` – Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` – Your Supabase anon key

Optional (for MVP):
- `EXPO_PUBLIC_PLAID_CLIENT_ID` – Plaid sandbox credentials
- `EXPO_PUBLIC_REVENUECAT_API_KEY` – RevenueCat API key

### 4. Run the App

**Start development server:**
```bash
npm start
```

**On iOS:**
```bash
npm run ios
```

**On Android:**
```bash
npm run android
```

**On Web:**
```bash
npm run web
```

## Services Architecture

All business logic is isolated in the `src/services/` layer. This keeps UI components clean and makes testing/mocking easier.

### Available Services

**Supabase** (`src/services/supabase.ts`)
- User authentication (sign up, sign in, sign out)
- Auth state management

**Secure Storage** (`src/services/storage.ts`)
- Encrypted key-value storage
- Safe for storing tokens, PII

**Analytics** (`src/services/analytics.ts`)
- Event tracking
- Screen tracking
- User properties
- Error tracking (placeholder)

**Plaid** (`src/services/plaid.ts`)
- Link token creation
- Public token exchange
- Account fetching
- Placeholder implementation (awaiting SDK setup)

**RevenueCat** (`src/services/revenueCat.ts`)
- Subscription management
- Offering fetching
- Purchase handling
- Placeholder implementation

### Adding a New Service

1. Create a file in `src/services/myService.ts`
2. Export service functions as an object
3. Add to `src/services/index.ts` barrel export
4. Import in screens/components as needed

Example:
```typescript
// src/services/myService.ts
export const myService = {
  async doSomething(param: string) {
    // Implementation
  }
};
```

## Development Guidelines

### No Platform-Specific Code in UI
- Use services layer for platform logic
- Keep components cross-platform

### Type Safety
- All `.ts` files should have proper type annotations
- Use `interface` for props, services, and API responses

### Logging
- Use `logger` utility from `src/utils/logger.ts`
- Logs are color-coded for readability

### Environment Variables
- Never commit `.env` file (added to `.gitignore`)
- All secrets in `.env` only
- Use `Config` from `src/constants/config.ts` to access

## Next Steps for MVP

1. **Create Screens**
   - Login/Register screen
   - Dashboard screen
   - Settings screen

2. **Implement Auth Flow**
   - Connect LoginScreen to `authService`
   - Wire up navigation based on auth state

3. **Add Debt Tracking**
   - Create Supabase tables (debts, accounts, etc.)
   - Build CRUD screens

4. **Integrate Plaid**
   - Set up Plaid Link SDK
   - Call backend to exchange public tokens

5. **Add Subscriptions**
   - Implement RevenueCat integration
   - Create paywall screen

6. **Analytics & Monitoring**
   - Configure Mixpanel or Amplitude
   - Set up error tracking (Sentry)

## Useful Commands

```bash
# Type check
npm run type-check

# Lint (configure ESLint as needed)
npm run lint

# Clean cache
expo start --clear
```

## Troubleshooting

**Port 8081 already in use:**
```bash
expo start -c  # Clear cache and restart
```

**Module not found errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors in IDE:**
- Restart TypeScript server (Cmd+Shift+P in VS Code → "TypeScript: Reload Project")

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Supabase Docs](https://supabase.com/docs)
- [React Native API](https://reactnative.dev/docs/getting-started)

[![Downloads](https://img.shields.io/npm/dm/typescript.svg)](https://www.npmjs.com/package/typescript)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/microsoft/TypeScript/badge)](https://securityscorecards.dev/viewer/?uri=github.com/microsoft/TypeScript)


[TypeScript](https://www.typescriptlang.org/) is a language for application-scale JavaScript. TypeScript adds optional types to JavaScript that support tools for large-scale JavaScript applications for any browser, for any host, on any OS. TypeScript compiles to readable, standards-based JavaScript. Try it out at the [playground](https://www.typescriptlang.org/play/), and stay up to date via [our blog](https://blogs.msdn.microsoft.com/typescript) and [Twitter account](https://twitter.com/typescript).

Find others who are using TypeScript at [our community page](https://www.typescriptlang.org/community/).

## Installing

For the latest stable version:

```bash
npm install -D typescript
```

For our nightly builds:

```bash
npm install -D typescript@next
```

## Contribute

There are many ways to [contribute](https://github.com/microsoft/TypeScript/blob/main/CONTRIBUTING.md) to TypeScript.
* [Submit bugs](https://github.com/microsoft/TypeScript/issues) and help us verify fixes as they are checked in.
* Review the [source code changes](https://github.com/microsoft/TypeScript/pulls).
* Engage with other TypeScript users and developers on [StackOverflow](https://stackoverflow.com/questions/tagged/typescript).
* Help each other in the [TypeScript Community Discord](https://discord.gg/typescript).
* Join the [#typescript](https://twitter.com/search?q=%23TypeScript) discussion on Twitter.
* [Contribute bug fixes](https://github.com/microsoft/TypeScript/blob/main/CONTRIBUTING.md).

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see
the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com)
with any additional questions or comments.

## Documentation

*  [TypeScript in 5 minutes](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
*  [Programming handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
*  [Homepage](https://www.typescriptlang.org/)

## Roadmap

For details on our planned features and future direction, please refer to our [roadmap](https://github.com/microsoft/TypeScript/wiki/Roadmap).
