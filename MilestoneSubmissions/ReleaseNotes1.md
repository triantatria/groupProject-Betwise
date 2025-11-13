## [0.0.1](https://github.com/triantatria/groupProject-Betwise.git) (2025-11-04)

> First pre-release of Betwise. Core structure, basic auth views, DB schema, and tooling are in place, but full functionality and game logic are still in progress.

### Upgrade Steps
* [ACTION REQUIRED] Pull latest `main`, recreate your local DB, and apply the new **Users** and **Leaderboards** tables.
* Update your `.env` to match the new `index.js` / Docker setup.

### Breaking Changes
* New interactive homepage and layout.
* Page and form structure (login, register, home, games) has been reorganized.

### New Features
* Initial Express `index.js` and base file structure.
* Login, register, Mines, and Blackjack Handlebars partials.
* **Users** and **Leaderboards** tables created/initialized.
* Initial `docker-compose` configuration.
* README updated with tech stack.

### Bug Fixes
* Fixed file locations so views render correctly.

### Other Changes
* Added **Week 1 Meeting Minutes**.
* General file cleanup and project organization.
