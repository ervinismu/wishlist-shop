# Sample issues for testing the factory

Create the labels first: `risk-low`, `risk-medium`, `risk-high`.
Then open these issues in order. Copy each title and body as written.

| # | Title | Label | What it tests |
|---|---|---|---|
| 1 | Add a product to the wishlist | `risk-low` | A simple happy path |
| 2 | Limit the wishlist to 100 items | `risk-low` | Following acceptance criteria |
| 3 | Remove an item from the wishlist | `risk-low` | Changing existing code |
| 4 | Share a wishlist by link | `risk-medium` | A bigger feature across API and page |
| 5 | Make the wishlist better | `risk-low` | Asking a question instead of guessing |
| 6 | Add a dark mode | none | The ready check stopping it |

Run them one at a time, and merge each PR before starting the next: later
issues build on earlier ones.

---

## 1. Add a product to the wishlist
**Label:** `risk-low`

```markdown
## What and why
Shoppers can see products but can't save them yet. Let them add a product to their wishlist.

## Acceptance criteria
- [ ] `POST /api/wishlist` with `{ "productId": "p1" }` adds the product and returns `201` with the new entry.
- [ ] Adding a product that is already in the wishlist returns `409` and does not add it twice.
- [ ] An unknown `productId` returns `404`; a missing or non-string `productId` returns `400`.
- [ ] Each product card on the page has an "Add to wishlist" button. After clicking it, the item appears in the wishlist panel without reloading.
- [ ] The button shows "In wishlist" and is disabled for products already saved.
- [ ] The wishlist is still there after restarting the server.
```

## 2. Limit the wishlist to 100 items
**Label:** `risk-low`

```markdown
## What and why
Very long wishlists slow the page down. Cap the wishlist at 100 items.

## Acceptance criteria
- [ ] Adding item number 101 returns `409` with the error "Your wishlist is full (100 items)".
- [ ] The page shows that message when adding fails because the list is full.
- [ ] A wishlist with exactly 100 items still loads normally.
- [ ] The limit is a single named constant, not a number repeated in several places.
```

## 3. Remove an item from the wishlist
**Label:** `risk-low`

```markdown
## What and why
Shoppers change their minds. Let them remove a saved item.

## Acceptance criteria
- [ ] `DELETE /api/wishlist/:productId` removes the item and returns `200`.
- [ ] Removing an item that isn't in the wishlist returns `404`.
- [ ] Each wishlist row on the page has a "Remove" button; the row disappears after clicking it.
- [ ] After removing, the product's "Add to wishlist" button works again.
```

## 4. Share a wishlist by link
**Label:** `risk-medium`

```markdown
## What and why
Shoppers want to send their wishlist to friends and family before a birthday.

## Acceptance criteria
- [ ] A "Share" button in the wishlist panel creates a share link and shows it with a "Copy link" button.
- [ ] The link opens a read-only page listing the wishlist items with names and prices. It has no add or remove buttons.
- [ ] The link contains a random, hard-to-guess token (at least 16 characters), not a simple number.
- [ ] The shared page shows the wishlist as it is now, including later changes.
- [ ] An invalid or unknown token shows a friendly "This wishlist link doesn't work" page with status `404`.

## Notes
There is only one wishlist in the app for now (no user accounts).
```

## 5. Make the wishlist better
**Label:** `risk-low`

This issue is vague on purpose. The factory should **ask a question** on the
issue instead of guessing. It still has an Acceptance criteria section so it
passes the ready check.

```markdown
## What and why
The wishlist could be better.

## Acceptance criteria
- [ ] The wishlist is better.
```

## 6. Add a dark mode
**Label:** none (leave it unlabelled)

This issue has no risk label and no Acceptance criteria section, so the
factory's ready check should **stop it** and comment with what's missing.

```markdown
It would be nice to have a dark mode for the shop.
```
