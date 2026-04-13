#!/bin/bash
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     AI Financial Market Indicator — Setup    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── Homebrew ──────────────────────────────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  echo -e "${YELLOW}► Installing Homebrew...${NC}"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for Apple Silicon Macs
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  fi
else
  echo -e "${GREEN}✓ Homebrew already installed${NC}"
fi

# ── Node.js ───────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${YELLOW}► Installing Node.js 20 LTS...${NC}"
  brew install node@20
  brew link --force node@20
else
  echo -e "${GREEN}✓ Node.js $(node -v) already installed${NC}"
fi

# ── Git ───────────────────────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  echo -e "${YELLOW}► Installing Git...${NC}"
  brew install git
else
  echo -e "${GREEN}✓ Git $(git --version | awk '{print $3}') already installed${NC}"
fi

# ── Project dependencies ──────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}► Installing backend dependencies...${NC}"
cd "$(dirname "$0")/../backend"
npm install

echo ""
echo -e "${CYAN}► Installing frontend dependencies...${NC}"
cd ../frontend
npm install

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup Complete! ✓               ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Next steps:                                 ║${NC}"
echo -e "${GREEN}║  1. cd aifmi                                 ║${NC}"
echo -e "${GREEN}║  2. npm run dev   (starts everything)        ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║  Dashboard → http://localhost:5173           ║${NC}"
echo -e "${GREEN}║  API       → http://localhost:3001           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
