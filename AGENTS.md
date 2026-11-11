# Rules for coding agents

This file is read by the software factory's agents before every task. Humans
can read it too: it is the team's coding rules, written down.

## The project
A small web shop where people browse products and keep a wishlist.

- `src/products.js` – the product catalogue (prices in **cents**, whole numbers)
- `src/store.js` – all data storage (in memory, saved to `data/db.json`)
- `src/app.js` – the JSON API under `/api` and static file serving
- `src/server.js` – starts the server
- `public/` – the web page (`index.html`, `app.js`, `styles.css`)
- `test/` – tests, using Node's built-in test runner

## Commands
| What | Command |
|---|---|
| Run the tests | `npm test` |
| Check syntax | `npm run lint` |
| Start the app | `npm start` → http://localhost:3000 |

Both `npm test` and `npm run lint` must pass before you finish.

## Rules
1. **No new dependencies.** The project uses only Node 22 built-in modules.
   If a task truly needs a package, stop and ask in `.factory/question.md`.
2. **Every change needs tests.** Add API tests to `test/api.test.js` (or a new
   `test/*.test.js` file). Cover the success case and at least one error case.
3. **Never weaken, skip or delete existing tests** to make them pass. If an
   existing test is wrong for the new behaviour, explain why in your summary.
4. **Keep changes small and focused** on the issue. No unrelated refactors.
5. **Data goes through `src/store.js`.** Add a store method for new data
   operations; route handlers must not touch the JSON file directly.
6. **API conventions**
   - Routes live in the `routes` list in `src/app.js`.
   - Success: JSON object, status `200` (or `201` when something is created).
   - Errors: `throw new HttpError(status, 'Message for people')`, which returns
     `{ "error": "..." }`. Use `400` for bad input, `404` for missing things,
     `409` for conflicts (for example a duplicate).
   - Read request bodies with `readJsonBody(req)` and validate every field.
   - To return a status other than 200, return `{ status: 201, body: {...} }`.
7. **Web page conventions**
   - Set text with `textContent`, never `innerHTML`.
   - Show a clear message when an action fails.
   - Keep elements usable by keyboard; buttons are real `<button>` elements.
8. **Money** is always stored and calculated in cents. Format it only for display.
9. **Business rules you are unsure about** (limits, wording, who can see what):
   don't guess. Ask in `.factory/question.md`.
