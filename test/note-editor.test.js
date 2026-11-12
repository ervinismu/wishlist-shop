// Note editor tests: the editor runs against small fake elements, and the
// stylesheet is checked for the layout rules.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { openNoteEditor } from '../public/note-editor.js';

const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');

function fakeRow() {
  const children = [];
  let focused = null;
  const make = (tag) => {
    const listeners = {};
    const node = {
      tag, attrs: {}, textContent: '', value: '',
      addEventListener: (type, fn) => { listeners[type] = fn; },
      setAttribute(k, v) { this.attrs[k] = v; },
      focus() { focused = node; },
      replaceWith(other) { children[children.indexOf(node)] = other; },
      after(other) { children.splice(children.indexOf(node) + 1, 0, other); },
      remove() { children.splice(children.indexOf(node), 1); },
      click: () => listeners.click?.(),
      press: (key) => listeners.keydown?.({ key }),
    };
    return node;
  };
  return { children, make, focused: () => focused };
}

function setup({ save = async () => {}, note = 'original' } = {}) {
  const row = fakeRow();
  const noteText = row.make('span');
  noteText.textContent = note;
  const editButton = row.make('button');
  row.children.push(editButton, noteText);
  const calls = { saved: [], errors: [], onSaved: 0 };
  openNoteEditor({
    name: 'Mug', note, noteText, editButton, create: row.make,
    save: async (v) => { calls.saved.push(v); return save(v); },
    onSaved: async () => { calls.onSaved += 1; },
    onError: (err) => calls.errors.push(err.message),
  });
  const [save1, cancel, input] = row.children;
  return { row, noteText, editButton, calls, saveButton: save1, input, cancel };
}

describe('note editor', () => {
  test('opens with the current note and focus in the field', () => {
    const t = setup();
    assert.equal(t.input.value, 'original');
    assert.equal(t.saveButton.textContent, 'Save note');
    assert.equal(t.cancel.textContent, 'Cancel');
    assert.equal(t.row.focused(), t.input);
  });

  test('Cancel closes without saving, restores the note and focuses Edit note', () => {
    const t = setup();
    t.input.value = 'changed';
    t.cancel.click();
    assert.deepEqual(t.row.children, [t.editButton, t.noteText]);
    assert.equal(t.noteText.textContent, 'original');
    assert.equal(t.row.focused(), t.editButton);
    assert.deepEqual(t.calls.saved, []);
  });

  test('Escape does the same as Cancel', () => {
    const t = setup();
    t.input.value = 'changed';
    t.input.press('Escape');
    assert.deepEqual(t.row.children, [t.editButton, t.noteText]);
    assert.equal(t.row.focused(), t.editButton);
    assert.deepEqual(t.calls.saved, []);
  });

  test('Enter and Save send the text, then hand over to onSaved', async () => {
    const t = setup();
    t.input.value = 'new note';
    t.input.press('Enter');
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(t.calls.saved, ['new note']);
    assert.equal(t.calls.onSaved, 1);
  });

  test('a failed save keeps the editor open and reports the error', async () => {
    const t = setup({ save: async () => { throw new Error('Note is too long'); } });
    t.input.value = 'x'.repeat(5);
    t.saveButton.click();
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(t.calls.errors, ['Note is too long']);
    assert.equal(t.calls.onSaved, 0);
    assert.equal(t.row.children[2], t.input);
    assert.equal(t.input.value, 'xxxxx');
  });
});

describe('layout', () => {
  test('styles.css has exactly one .wishlist-item rule', () => {
    assert.equal((css.match(/^\.wishlist-item\s*\{/gm) ?? []).length, 1);
  });

  test('note takes its own line; controls are compact enough for the sidebar', () => {
    assert.match(css, /\.wishlist-note\s*\{[^}]*flex-basis:\s*100%/);
    assert.match(css, /\.wishlist-item button\s*\{[^}]*padding:\s*4px 8px/);
    const width = Number(css.match(/grid-template-columns:\s*1fr (\d+)px/)[1]);
    // content width = sidebar - 2*16px padding; controls need roughly 280px
    assert.ok(width - 32 >= 296, 'sidebar wide enough');
  });
});
