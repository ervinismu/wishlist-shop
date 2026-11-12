# Review guide

The reviewer agent follows this guide on top of its fixed review steps.
It is read from `main`, so a pull request cannot change its own review.

## Always
- Run `npm test` and `npm run lint`. Any failure is a high finding.
- Check each acceptance criterion against the code and the tests, one by one.

## Web page changes (`public/`)
- Follow every path that hides, removes or re-renders an element. If focus can
  fall back to `<body>`, that is a medium finding.
- Check that an old error message is cleared when the action later succeeds,
  and that late responses can't overwrite newer ones.
- Tests must check behaviour (text shown, focus, messages) with fake elements,
  as `test/note-editor.test.js` does. Tests that only search the source for
  strings are a medium finding.

## Business rules
- Numbers, limits, wording or sample data that the issue and its discussion
  don't state are a medium finding, unless the summary says why.

## Repeated findings
- If a low finding from an earlier round is still not fixed, report it again
  as medium, so it gets fixed instead of being repeated.
