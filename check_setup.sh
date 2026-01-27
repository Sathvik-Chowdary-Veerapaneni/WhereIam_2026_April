#!/bin/bash

# Debt Mirror MVP - Quick Check Script
# Verifies all essential files are in place

echo "🔍 Checking Debt Mirror Project Structure..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

MISSING=0

# Helper function
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
  else
    echo -e "${RED}✗${NC} $1"
    MISSING=$((MISSING + 1))
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} $1/"
  else
    echo -e "${RED}✗${NC} $1/"
    MISSING=$((MISSING + 1))
  fi
}

echo "📁 Directories:"
check_dir "src"
check_dir "src/screens"
check_dir "src/components"
check_dir "src/services"
check_dir "src/navigation"
check_dir "src/constants"
check_dir "src/utils"
check_dir "src/assets"

echo ""
echo "📄 Root Files:"
check_file "App.tsx"
check_file "app.json"
check_file "package.json"
check_file "tsconfig.json"
check_file ".env.example"
check_file ".gitignore"
check_file "README.md"

echo ""
echo "🎨 Screens:"
check_file "src/screens/HomeScreen.tsx"
check_file "src/screens/LoginScreen.tsx"
check_file "src/screens/NotFoundScreen.tsx"
check_file "src/screens/index.ts"

echo ""
echo "🔧 Services:"
check_file "src/services/supabase.ts"
check_file "src/services/storage.ts"
check_file "src/services/analytics.ts"
check_file "src/services/plaid.ts"
check_file "src/services/revenueCat.ts"
check_file "src/services/index.ts"

echo ""
echo "🧭 Navigation:"
check_file "src/navigation/RootNavigator.tsx"
check_file "src/navigation/types.ts"

echo ""
echo "⚙️  Config & Utils:"
check_file "src/constants/config.ts"
check_file "src/utils/logger.ts"

echo ""
echo "💾 Components:"
check_file "src/components/LoadingSpinner.tsx"
check_file "src/components/index.ts"

echo ""
if [ $MISSING -eq 0 ]; then
  echo -e "${GREEN}✅ All files present!${NC}"
else
  echo -e "${RED}⚠️  Missing $MISSING files${NC}"
fi

echo ""
echo "📦 Dependencies:"
if [ -d "node_modules" ]; then
  echo -e "${GREEN}✓${NC} node_modules installed"
else
  echo -e "${YELLOW}⚠${NC}  Run 'npm install'"
fi

echo ""
echo "🚀 To get started:"
echo "  1. Update .env with Supabase credentials"
echo "  2. Run: npm start"
echo "  3. Choose: ios | android | web"
echo ""
