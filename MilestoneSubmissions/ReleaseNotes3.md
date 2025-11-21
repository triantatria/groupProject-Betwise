## [0.0.3](https://github.com/triantatria/groupProject-Betwise/compare/0.0.2...0.0.3) (2025-11-18)

> Third pre-release of Betwise. This update focuses on polishing the UI (leaderboard, footer, and login/profile access), consolidating styling logic, and cleaning up tests/code. Core game logic and data model are still in flux and the product remains in pre-release.

### Upgrade Steps
* [ACTION REQUIRED] Pull latest `main` and restart your dev environment:  
  * `docker compose down -v && docker compose up --build`
* No DB schema changes in this release; existing `Users` and `Leaderboards` tables can be reused.

### Breaking Changes
* None known for this release. Existing routes, schemas, and core game flows should continue to work.

### New Features
* Merged new **Leaderboard UI** updates, improving layout and styling for viewing rankings.
* Added a shared **footer Handlebars partial** to the main layout, with logic to hide it on specific pages where extra space is needed.
* Updated routing to the **profile page** and added a visible **login button** plus additional styling tweaks to make auth/profile entry points clearer.
* Consolidated and merged **HTML styling with Slots game logic**, ensuring consistent visuals and behavior across the Slots page.
* Moved some UI styling into JS/templated code to centralize presentation logic and make future adjustments easier.

### Bug Fixes
* Addressed a **test fix** commit to get the current test suite back to passing.
* Removed an unused/obsolete `pool` reference to avoid confusion and potential runtime issues.
* Formatting and minor structural cleanups in HTML/JS to reduce layout glitches and style inconsistencies.

### Performance Improvements
* Small cleanups (removing unused code and consolidating UI styling) slightly reduce client and server surface area, making future optimizations easier.

### Other Changes
* Added Week 4 meeting notes/minutes to the repo; earlier Week 3 notes were also committed.
* Updated and re-uploaded the `ReleaseNotes2` file corresponding to version `0.0.2`.
* Merged `main` into feature branches (e.g., `linley_branch`) and then merged those back via PRs to keep long-lived branches in sync with the latest work.
* General project tidying and organization improvements across the codebase.

