## [1.0.0](https://github.com/triantatria/groupProject-Betwise/compare/0.0.3...1.0.0) (2025-12-05)

> **First full release of Betwise.** Core wallet + game flows are now fully wired to the backend, Mines supports cashout with a multiplier, and the UI has been polished into a cohesive, sleek experience. This is the first version intended for real end-to-end use rather than pre-release only.

---

### Upgrade Steps
* [ACTION REQUIRED] Pull latest `main` and rebuild:
  * `docker compose down -v && docker compose up --build`
* No manual DB schema changes are required if you were already on `0.0.3`; existing `Users`, `Leaderboards`, and game-related tables are reused.

---

### Breaking Changes
* None known. Existing routes and auth flows remain intact.
* As always, if you have custom seed data, re-verify after upgrading that balances and users still match your expectations.

---

### New Features

* **Full Wallet ↔ Backend Integration**
  * Wallet balance is now fully backed by the database.
  * Deposits, bets, and game outcomes update both the session and DB in sync.
  * Header and game pages read the **fresh balance** from the backend and keep the UI up to date after each action.

* **All Games Connected to Backend**
  * All current games (e.g., **Mines**, **Slots**, etc.) now call backend routes instead of using stubbed or hardcoded values.
  * Game results, wagers, and payouts are stored per user, enabling accurate balances and future analytics/leaderboards.

* **Mines Cashout Multiplier**
  * Mines now supports a **cashout** feature that rewards players based on how many safe tiles they’ve revealed.
  * A **dynamic multiplier** is applied at cashout, and the resulting winnings are immediately added to the user’s wallet.
  * UI clearly shows current bet, revealed tiles, and cashout result to avoid confusion.

* **Sleek Unified UI & Design**
  * Polished page layouts and consistent **Betwise branding** across nav, auth, games, and profile.
  * Improved spacing, typography, and component styling for a more modern, casino-style feel that still stays clean and readable.
  * Refined error/success states for wallet and games so users understand what just happened (and why).

* **About Page**
  * New **About** page listing all group members and their roles in the project.
  * Serves as a central place for instructors/users to see the team behind the app.

---

### Bug Fixes
* Fixed various **wallet desync issues**, including balances not updating after certain game outcomes or refreshes.
* Resolved intermittent errors when fetching user data for profiles and game pages.
* Cleaned up edge cases where invalid bets or missing session data could cause crashes instead of user-friendly error messages.

---

### Performance Improvements
* Reduced redundant DB queries for user/profile/wallet calls where possible.
* Simplified some frontend logic so that balance and game state updates are handled in fewer, clearer paths.
* Small server-side cleanups that lower overall surface area and make future optimizations easier.

---

### Future Improvements / Roadmap

These are **not** in 1.0.0 yet, but are being considered for future releases:

* **AI Tutor for Responsible Gambling**
  * An in-app **AI tutor/coach** to walk new players through:
    * How each game works
    * Basic probability and odds
    * Bankroll management and risk awareness
  * Goal is to make Betwise an educational tool about **gambling risks** and decision-making, not just a game hub.

* **Per-Game Leaderboards**
  * Separate leaderboards for each game (e.g., Mines leaderboard, Slots leaderboard).
  * Potential metrics: highest single win, best streaks, total profit per game, etc.
  * This will build on the existing global leaderboard work introduced in earlier pre-releases.

* **Additional UX Polish**
  * More animations and micro-interactions for game results and cashouts.
  * Better mobile responsiveness and accessibility improvements.

---

If you encounter any issues with the new wallet/game integration or Mines cashout behavior, log them with steps to reproduce so they can be addressed in the next point release.
