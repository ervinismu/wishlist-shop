# Wishlist Shop

A small web shop where people browse products and save them to a wishlist.
It is the sample project for a home **software factory**: you write GitHub
issues, the factory turns them into pull requests, and you review them.

## Run it
Needs Node 22 or newer. No packages to install.

```bash
npm start        # http://localhost:3000
npm test         # run the tests
npm run lint     # check syntax
```

## Where things are
| Path | What |
|---|---|
| `src/app.js` | API routes and static files |
| `src/store.js` | Data storage (`data/db.json`) |
| `src/products.js` | Product catalogue |
| `public/` | The web page |
| `test/` | Tests (Node's built-in test runner) |
| `AGENTS.md` | Coding rules the factory's agents follow |
| `docs/sample-issues.md` | Six issues to try the factory with |

## Working with the factory
1. Open an issue with the **Feature** template. Fill in the
   **Acceptance criteria** section.
2. Optional: add a label `risk-low`, `risk-medium` or `risk-high`. It is shown
   to the reviewer; it doesn't change any rules.
3. In Slack: `@factory start <issue number>`.
4. Review the pull request. CI runs the tests on every PR.

**Every pull request needs a human approval.** The factory never merges. It
opens PRs from its own GitHub account, so a person can review and approve them
(GitHub doesn't let anyone approve their own PR).
