// Data storage for the shop.
//
// Data is kept in memory and, when a file path is given, saved to a JSON file
// after every change. Tests use the in-memory store (no file).
//
// Shape of the stored data:
//   { wishlist: [ { productId: "p1", addedAt: "2026-01-01T00:00:00.000Z", quantity: 1, note: "optional text" } ],
//     shareToken: null or a random string used in the share link }

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname } from 'node:path';

// Maximum number of items on the wishlist.
export const MAX_WISHLIST_ITEMS = 100;

// Highest quantity allowed for one wishlist item.
export const MAX_QUANTITY = 10;

// Longest note (in characters, after trimming) allowed on a wishlist item.
export const MAX_NOTE_LENGTH = 200;

const EMPTY = () => ({ wishlist: [], shareToken: null });

export function createStore({ file } = {}) {
  let data = EMPTY();

  if (file && existsSync(file)) {
    data = { ...EMPTY(), ...JSON.parse(readFileSync(file, 'utf8')) };
  }

  function save() {
    if (!file) return;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(data, null, 2));
  }

  return {
    // Returns the wishlist entries, oldest first.
    getWishlist() {
      return data.wishlist.map((entry) => ({ ...entry, quantity: entry.quantity ?? 1, note: entry.note ?? null }));
    },

    // Number of entries on the wishlist.
    countWishlist() {
      return data.wishlist.length;
    },

    // Adds a product to the wishlist. Returns the new entry, or null if it is already there.
    addToWishlist(productId, quantity = 1) {
      if (data.wishlist.some((entry) => entry.productId === productId)) return null;
      const entry = { productId, addedAt: new Date().toISOString(), quantity };
      data.wishlist.push(entry);
      save();
      return { ...entry, note: null };
    },

    // Updates quantity and/or note of an item (pass undefined to leave a field alone;
    // a note of null removes it). Returns the updated entry, or null if it is not on the list.
    updateWishlistItem(productId, { quantity, note }) {
      const entry = data.wishlist.find((e) => e.productId === productId);
      if (!entry) return null;
      if (quantity !== undefined) entry.quantity = quantity;
      if (note !== undefined) {
        if (note === null) delete entry.note;
        else entry.note = note;
      }
      save();
      return { ...entry, quantity: entry.quantity ?? 1, note: entry.note ?? null };
    },

    // Removes a product from the wishlist. Returns true if it was there, false if not.
    removeFromWishlist(productId) {
      const index = data.wishlist.findIndex((entry) => entry.productId === productId);
      if (index === -1) return false;
      data.wishlist.splice(index, 1);
      save();
      return true;
    },

    // Returns the wishlist share token, creating a random one the first time.
    getOrCreateShareToken() {
      if (!data.shareToken) {
        data.shareToken = randomBytes(24).toString('base64url'); // 32 characters
        save();
      }
      return data.shareToken;
    },

    // Turns sharing off: the old token stops working. Sharing again makes a new token.
    clearShareToken() {
      if (data.shareToken === null) return;
      data.shareToken = null;
      save();
    },

    // True if the token matches the current share token.
    isValidShareToken(token) {
      return typeof token === 'string' && data.shareToken !== null && token === data.shareToken;
    },

    // Replace all data. Used by tests to set up a known state.
    reset(newData = EMPTY()) {
      data = { ...EMPTY(), ...structuredClone(newData) };
      save();
    },

    save,
  };
}
