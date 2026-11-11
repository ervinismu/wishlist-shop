// Data storage for the shop.
//
// Data is kept in memory and, when a file path is given, saved to a JSON file
// after every change. Tests use the in-memory store (no file).
//
// Shape of the stored data:
//   { wishlist: [ { productId: "p1", addedAt: "2026-01-01T00:00:00.000Z" } ] }

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const EMPTY = () => ({ wishlist: [] });

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
      return data.wishlist.map((entry) => ({ ...entry }));
    },

    // Adds a product to the wishlist. Returns the new entry, or null if it is already there.
    addToWishlist(productId) {
      if (data.wishlist.some((entry) => entry.productId === productId)) return null;
      const entry = { productId, addedAt: new Date().toISOString() };
      data.wishlist.push(entry);
      save();
      return { ...entry };
    },

    // Replace all data. Used by tests to set up a known state.
    reset(newData = EMPTY()) {
      data = { ...EMPTY(), ...structuredClone(newData) };
      save();
    },

    save,
  };
}
