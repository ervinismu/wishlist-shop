// The inline note editor. It only uses a few DOM methods, so tests can drive it
// with simple fake elements. `create(tag)` makes an element.
export function openNoteEditor({ name, note, noteText, editButton, create, save, onSaved, onError }) {
  const input = create('input');
  input.className = 'wishlist-note-input';
  input.type = 'text';
  input.value = note ?? '';
  input.setAttribute('aria-label', `Note for ${name}`);
  const saveButton = create('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Save note';
  const cancel = create('button');
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.setAttribute('aria-label', `Cancel editing note for ${name}`);

  const close = () => {
    input.replaceWith(noteText);
    cancel.remove();
    saveButton.replaceWith(editButton);
    editButton.focus();
  };
  saveButton.addEventListener('click', async () => {
    try {
      await save(input.value);
    } catch (err) {
      // Keep the editor open so the text is not lost.
      onError(err);
      return;
    }
    await onSaved();
  });
  cancel.addEventListener('click', close);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') saveButton.click();
    if (event.key === 'Escape') close();
  });
  noteText.replaceWith(input);
  editButton.replaceWith(saveButton);
  saveButton.after(cancel);
  input.focus();
}
