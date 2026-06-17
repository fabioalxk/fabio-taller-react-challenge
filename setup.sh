#!/usr/bin/env bash
# Run this ONCE before your interview to pre-install dependencies.
# Verifies node + npm, installs packages, type-checks the project.
set -euo pipefail

echo "node: $(node -v)"
echo "npm:  $(npm -v)"
npm install
npx tsc --noEmit
echo
echo "✓ Setup complete. On interview day, run:"
echo "    npm run dev:server   # terminal 1"
echo "    npm run dev:client   # terminal 2"
echo "Then open http://localhost:5173"
