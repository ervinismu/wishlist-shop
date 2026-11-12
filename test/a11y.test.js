// Accessibility checks on the page HTML and stylesheet.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');

function tagWithId(id) {
  const m = html.match(new RegExp(`<[^>]*\\bid="${id}"[^>]*>`));
  assert.ok(m, `#${id} exists`);
  return m[0];
}

describe('accessibility', () => {
  test('skip link is the first focusable element and targets the wishlist', () => {
    const first = html.match(/<(a|button|input|select|textarea)\b[^>]*>/);
    assert.match(first[0], /class="skip-link"/);
    assert.match(first[0], /href="#wishlist"/);
    assert.match(html, /Skip to wishlist/);
    assert.match(tagWithId('wishlist'), /tabindex="-1"/);
  });

  test('status messages use role=status, errors use role=alert', () => {
    for (const id of ['products-status', 'wishlist-status', 'share-status']) {
      assert.match(tagWithId(id), /role="status"/, id);
    }
    for (const id of ['action-status', 'csv-status', 'share-error']) {
      assert.match(tagWithId(id), /role="alert"/, id);
    }
  });

  test('focus-visible outline is defined and not removed', () => {
    assert.match(css, /:focus-visible\s*{[^}]*outline:\s*3px solid var\(--accent\)/);
  });
});
