## [0.0.2](https://github.com/triantatria/groupProject-Betwise/compare/0.0.1...0.0.2) (2025-11-11)

> Second pre-release of Betwise. Core site layout is now styled, game pages are wired up with initial client-side logic, and auth/user handling has been tightened, but the product is still in pre-release and game logic may change.

### Upgrade Steps
* [ACTION REQUIRED] Pull latest `main` and restart your dev environment:  
  * `docker compose down -v && docker compose up --build`
* No DB schema changes; existing `Users` and `Leaderboards` tables can be reused.

### Breaking Changes
* None known for this release. Existing routes and schema should continue to work.

### New Features
* Added HTML/CSS layouts for **Blackjack**, **Slots**, and **Mines** game pages.
* New login/entry page styling with shared CSS foundation, framework, and animations.
* Initial slot machine instructions dropdown and other UX improvements on the Slots page.
* Implemented initial client-side logic for Blackjack and Mines; updated Slots logic.
* Created a basic profile page and corresponding API route to support user profiles.

### Bug Fixes
* Fixed user-handling logic for login and register flows (validation/redirect issues).
* Resolved login/register page rendering problems and related routing issues.
* Cleaned up tests and updated `server.spec.js` / package test configuration.
* Removed duplicate Docker compose file and small leftover TODOs.

### Performance Improvements
* None targeted in this release (focus was on functionality and UI polish).

### Other Changes
* Added Week 3 meeting notes/minutes to the repo.
* General file cleanup, minor route/sample additions, and project organization updates.
