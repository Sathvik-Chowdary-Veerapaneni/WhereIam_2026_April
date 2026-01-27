# 🪞 Debt Mirror

A gamified debt tracking app that visualizes your financial journey along with your debt. Built with React Native + Expo.

![React Native](https://img.shields.io/badge/React_Native-0.74-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo-51-000020?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase)


## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/Sathvik-Chowdary-Veerapaneni/WhereIam_2026_April.git
cd WhereIam_2026_April
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Run
npm start           # Start Expo dev server
npm run ios         # iOS simulator
npm run android     # Android emulator
```


## 🔐 Environment Variables

Create `.env` from `.env.example`:

```env
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/WhereIam_2026_April.git`
3. Create a branch: `git checkout -b feature/your-feature`
4. Install dependencies: `npm install`

### Development

```bash
npm start              # Start dev server
npm run type-check     # Check TypeScript
npx expo start --clear # Clear cache & restart
```

### Guidelines

- ✅ Write TypeScript with proper types
- ✅ Keep components small and focused
- ✅ Use the services layer for business logic
- ✅ Test on both iOS and Android if possible
- ✅ Follow existing code patterns

### Submit Changes

1. Commit your changes: `git commit -m "feat: add new feature"`
2. Push to your fork: `git push origin feature/your-feature`
3. Open a Pull Request

### Commit Convention

```
feat: add new feature
fix: fix a bug  
docs: update documentation
style: formatting, no code change
refactor: restructure code
test: add tests
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Sathvik-Chowdary-Veerapaneni">Sathvik Veerapaneni</a>
</p>
