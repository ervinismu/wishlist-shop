// Theme tests: choice logic, persistence, and readable colours in both themes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { THEME_KEY, initTheme, nextTheme, resolveTheme } from '../public/theme.js';

const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');

function fakeEnv({ saved, prefersDark = false, throwing = false } = {}) {
  const data = new Map(saved ? [[THEME_KEY, saved]] : []);
  const storage = {
    getItem: (k) => { if (throwing) throw new Error('blocked'); return data.get(k) ?? null; },
    setItem: (k, v) => { if (throwing) throw new Error('blocked'); data.set(k, v); },
  };
  const doc = { documentElement: { dataset: {} } };
  const win = { matchMedia: () => ({ matches: prefersDark }) };
  let click;
  const button = {
    textContent: '',
    attrs: {},
    addEventListener: (_, fn) => { click = fn; },
    setAttribute(k, v) { this.attrs[k] = v; },
  };
  return { data, storage, doc, win, button, click: () => click() };
}

describe('theme choice', () => {
  test('saved choice wins, otherwise system preference', () => {
    assert.equal(resolveTheme('dark', false), 'dark');
    assert.equal(resolveTheme('light', true), 'light');
    assert.equal(resolveTheme(null, true), 'dark');
    assert.equal(resolveTheme('garbage', false), 'light');
    assert.equal(nextTheme('light'), 'dark');
    assert.equal(nextTheme('dark'), 'light');
  });

  test('toggle switches theme and remembers it after a reload', () => {
    const env = fakeEnv();
    initTheme(env.button, env);
    assert.equal(env.doc.documentElement.dataset.theme, 'light');
    env.click();
    assert.equal(env.doc.documentElement.dataset.theme, 'dark');
    assert.equal(env.button.attrs['aria-pressed'], 'true');
    assert.equal(env.data.get(THEME_KEY), 'dark');

    const reloaded = fakeEnv({ saved: env.data.get(THEME_KEY) });
    initTheme(reloaded.button, reloaded);
    assert.equal(reloaded.doc.documentElement.dataset.theme, 'dark');
  });

  test('still works when storage is unavailable', () => {
    const env = fakeEnv({ throwing: true });
    initTheme(env.button, env);
    env.click();
    assert.equal(env.doc.documentElement.dataset.theme, 'dark');
  });
});

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function vars(block) {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

describe('readable colours', () => {
  const light = vars(css.match(/:root \{([^}]*)\}/)[1]);
  const dark = { ...light, ...vars(css.match(/:root\[data-theme="dark"\] \{([^}]*)\}/)[1]) };
  for (const [name, v] of [['light', light], ['dark', dark]]) {
    test(`${name} theme has WCAG AA contrast`, () => {
      for (const bg of [v.bg, v.surface]) {
        assert.ok(contrast(v.text, bg) >= 4.5, 'text');
        assert.ok(contrast(v.muted, bg) >= 4.5, 'muted text');
        assert.ok(contrast(v.accent, bg) >= 4.5, 'accent text');
      }
      assert.ok(contrast(v['on-accent'], v.accent) >= 4.5, 'button text');
    });
  }
});
