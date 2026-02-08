#!/usr/bin/env bash
# Creates 60+ professional commits for Overflow dApp - run from repo root.
# Author: AmaanSayyad | amaansayyad@yahoo.com

set -e
cd "$(dirname "$0")/.."

# Configure git identity for this repo only
git config user.email "amaansayyad@yahoo.com"
git config user.name "AmaanSayyad"

# Remote (ensure it exists)
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/AmaanSayyad/Overflow.git

commit() {
  local msg="$1"
  shift
  [ $# -gt 0 ] && git add -- "$@"
  git commit -m "$msg"
}

# 1
commit "chore: add .gitignore for Next.js, Node and Supabase" .gitignore

# 2
commit "chore: add Next.js and TypeScript configuration" next.config.ts tsconfig.json

# 3
commit "chore: add ESLint and PostCSS config" eslint.config.mjs postcss.config.mjs

# 4
commit "chore: add package.json and lockfile with Sui, Supabase deps" package.json package-lock.json

# 5
commit "feat(types): add game and round domain types" types/game.ts

# 6
commit "feat(types): add bet and payout types" types/bet.ts

# 7
commit "feat(types): add flow and app state types" types/flow.ts

# 8
commit "feat(types): add Sui chain and treasury types" types/sui.ts

# 9
commit "feat(sui): add Move package manifest and lockfile" sui-contracts/Move.toml sui-contracts/Move.lock

# 10
commit "feat(sui): add treasury Move smart contract" sui-contracts/sources/treasury.move

# 11
commit "feat(sui): add Sui client config and network config" lib/sui/config.ts lib/sui/network-config.ts

# 12
commit "feat(sui): add Sui SDK client and RPC helpers" lib/sui/client.ts

# 13
commit "feat(sui): add wallet adapter and event listener" lib/sui/wallet.ts lib/sui/event-listener.ts

# 14
commit "chore(supabase): add Supabase client" lib/supabase/client.ts

# 15
commit "feat(db): add user_balances table migration" supabase/migrations/001_create_user_balances.sql

# 16
commit "feat(db): add balance_audit_log migration" supabase/migrations/002_create_balance_audit_log.sql

# 17
commit "feat(db): add balance procedures migration" supabase/migrations/003_create_balance_procedures.sql

# 18
commit "feat(db): add reconciliation procedure migration" supabase/migrations/004_create_reconciliation_procedure.sql

# 19
commit "feat(lib): add app constants and formatters" lib/utils/constants.ts lib/utils/formatters.ts

# 20
commit "feat(lib): add error handling and error toast utilities" lib/utils/errors.ts lib/utils/errorToast.ts

# 21
commit "feat(lib): add Pyth price feed integration" lib/utils/priceFeed.ts

# 22
commit "feat(lib): add balance synchronization and reconciliation docs" lib/balance/synchronization.ts lib/balance/RECONCILIATION_README.md

# 23
commit "test(lib): add utils and balance unit tests" lib/utils/__tests__/errors.test.ts lib/utils/__tests__/errorToast.test.ts lib/balance/__tests__/reconciliation.test.ts lib/balance/__tests__/synchronization.test.ts

# 24
commit "feat(store): add wallet slice for dapp-kit state" lib/store/walletSlice.ts

# 25
commit "feat(store): add game slice for rounds and bets" lib/store/gameSlice.ts

# 26
commit "feat(store): add history slice for bet history" lib/store/historySlice.ts

# 27
commit "feat(store): add balance slice and store exports" lib/store/balanceSlice.ts lib/store/index.ts

# 28
commit "feat(store): add store task completion notes" lib/store/TASK_7.1_COMPLETION.md lib/store/TASK_8_COMPLETION.md

# 29
commit "feat(ui): add Button, Card and Modal components" components/ui/Button.tsx components/ui/Card.tsx components/ui/Modal.tsx

# 30
commit "feat(ui): add Toast and ToastProvider" components/ui/Toast.tsx components/ui/ToastProvider.tsx

# 31
commit "feat(ui): add LoadingSpinner and Banner" components/ui/LoadingSpinner.tsx components/ui/Banner.tsx

# 32
commit "feat(ui): add UI component barrel exports" components/ui/index.ts

# 33
commit "feat(hooks): add useToast hook" lib/hooks/useToast.tsx

# 34
commit "feat(logging): add error logger" lib/logging/error-logger.ts

# 35
commit "feat(wallet): add WalletConnect and WalletInfo components" components/wallet/WalletConnect.tsx components/wallet/WalletInfo.tsx components/wallet/index.ts

# 36
commit "feat(balance): add BalanceDisplay and DepositModal" components/balance/BalanceDisplay.tsx components/balance/DepositModal.tsx

# 37
commit "feat(balance): add WithdrawModal and balance exports" components/balance/WithdrawModal.tsx components/balance/index.ts

# 38
commit "test(balance): add balance component tests" components/balance/__tests__/BalanceDisplay.test.tsx components/balance/__tests__/DepositModal.test.tsx components/balance/__tests__/WithdrawModal.test.tsx

# 39
commit "feat(game): add GameBoard and TargetGrid" components/game/GameBoard.tsx components/game/TargetGrid.tsx

# 40
commit "feat(game): add BetControls and RoundTimer" components/game/BetControls.tsx components/game/RoundTimer.tsx

# 41
commit "feat(game): add ActiveRound and LiveChart" components/game/ActiveRound.tsx components/game/LiveChart.tsx

# 42
commit "feat(game): add game exports and task notes" components/game/index.ts components/game/TASK_11.1_COMPLETION.md

# 43
commit "feat(history): add BetCard and BetHistory" components/history/BetCard.tsx components/history/BetHistory.tsx components/history/index.ts

# 44
commit "feat(api): add balance by address route" "app/api/balance/[address]/route.ts"

# 45
commit "feat(api): add deposit route" app/api/balance/deposit/route.ts

# 46
commit "feat(api): add withdraw route" app/api/balance/withdraw/route.ts

# 47
commit "feat(api): add bet route" app/api/balance/bet/route.ts

# 48
commit "feat(api): add win and payout routes" app/api/balance/win/route.ts app/api/balance/payout/route.ts

# 49
commit "feat(api): add events route" app/api/balance/events/route.ts

# 50
commit "feat(api): add balance API task completion notes" app/api/balance/TASK_4.1_COMPLETION.md app/api/balance/deposit/TASK_4.2_COMPLETION.md app/api/balance/withdraw/TASK_4.3_COMPLETION.md app/api/balance/bet/TASK_4.4_COMPLETION.md app/api/balance/payout/TASK_4.5_COMPLETION.md

# 51
commit "test(api): add balance API route tests" \
  "app/api/balance/[address]/__tests__/route.test.ts" \
  "app/api/balance/deposit/__tests__/route.test.ts" \
  "app/api/balance/withdraw/__tests__/route.test.ts" \
  "app/api/balance/bet/__tests__/route.test.ts" \
  "app/api/balance/payout/__tests__/route.test.ts"

# 52
commit "test(supabase): add Supabase migration tests" supabase/__tests__/user_balances.test.ts supabase/__tests__/balance_audit_log.test.ts supabase/__tests__/balance_procedures.test.ts

# 53
commit "chore(test): add Jest config and setup" jest.config.js jest.setup.js

# 54
commit "feat(lib): add utils task completion note" lib/utils/TASK_13.1_COMPLETION.md

# 55
commit "feat(app): add root layout and global styles" app/layout.tsx app/globals.css

# 56
commit "feat(app): add wallet and toast providers" app/providers.tsx

# 57
commit "feat(app): add main page and favicon" app/page.tsx app/favicon.ico

# 58
commit "chore(assets): add public SVG assets" public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg

# 59
commit "chore(assets): add Overflow branding assets" public/overflowlogo.ico public/overflowlogo.png

# 60
commit "chore(supabase): add migration and verification scripts" supabase/scripts/apply-migration.ts supabase/scripts/show-migration.ts supabase/scripts/verify-setup.ts

# 61
commit "chore(scripts): add verify-deposit-withdrawal script" scripts/verify-deposit-withdrawal.ts

# 62
commit "docs: add README with architecture and setup" README.md

# 63
commit "chore: add test coverage report" lcov.info

echo "Done. Total commits: $(git rev-list --count HEAD)"
echo "Push with: git push -u origin main"
