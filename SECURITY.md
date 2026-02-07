# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Debt Mirror, please follow these steps:

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Email us at: security@debtmirror.app (or contact the repository owner directly)
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Response time**: We aim to acknowledge reports within 48 hours
- **Investigation**: We will investigate and keep you informed of progress
- **Fix timeline**: Critical issues will be prioritized
- **Recognition**: With your permission, we'll credit you in the fix announcement

## Security Practices

This project follows these security practices:

### Environment Variables
- All sensitive credentials stored in `.env` files
- `.env` is gitignored - never committed
- Loaded via `process.env.EXPO_PUBLIC_*` pattern

### Authentication
- Powered by Supabase Auth
- Supports email/password, magic links, and OAuth
- Passwords never stored in plaintext

### Database
- Row Level Security (RLS) policies enabled
- User data isolated per user_id
- No direct database access from client

### Code
- No hardcoded API keys or secrets
- TypeScript for type safety
- Regular security audits

## Excluded from Git

The following sensitive files are gitignored:

```
.env
.env.local
*.sql
DB_Schemas_Confidential/
*.jks, *.keystore
*.p8, *.p12, *.cer, *.crt, *.key, *.pem
```

## Contact

For security concerns, contact the repository owner:
- GitHub: [@Sathvik-Chowdary-Veerapaneni](https://github.com/Sathvik-Chowdary-Veerapaneni)
