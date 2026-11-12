// The page script needs a browser, so these tests check the stylesheet and
// the page script source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('styles.css has exactly one .wishlist-item rule', () => {
  const rules = css.match(/^\.wishlist-item\s*\{/gm) ?? [];
  assert.equal(rules.length, 1);
  const rule = css.match(/^\.wishlist-item\s*\{[^}]*\}/m)[0];
  assert.match(rule, /flex-wrap:\s*wrap/);
});

test('the note takes its own line and sits after the buttons', () => {
  assert.match(css, /\.wishlist-note\s*\{[^}]*flex-basis:\s*100%/);
  assert.ok(js.indexOf('remove,\n        noteText') > 0, 'noteText is appended last');
});

test('note editor has Cancel, Escape and focus return', () => {
  assert.match(js, /'Cancel'/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(js, /editButton\.focus\(\)/);
  assert.match(js, /focusEditNote\(productId\)/);
});
