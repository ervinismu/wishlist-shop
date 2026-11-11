// Web page logic. Loads products and the wishlist from the API and shows them.
// Always set text with textContent (never innerHTML) so data can't inject HTML.

const productList = document.getElementById('product-list');
const productsStatus = document.getElementById('products-status');
const wishlistList = document.getElementById('wishlist-list');
const wishlistStatus = document.getElementById('wishlist-status');
const actionStatus = document.getElementById('action-status');

let products = [];
let wishlistIds = new Set();

export function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function addToWishlist(productId) {
  actionStatus.textContent = '';
  try {
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    if (!res.ok && res.status !== 409) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${res.status})`);
    }
    const { items } = await getJson('/api/wishlist');
    renderWishlist(items);
  } catch (err) {
    console.error(err);
    actionStatus.textContent = `Could not add to wishlist: ${err.message}`;
  }
}

function renderProducts() {
  productList.replaceChildren(
    ...products.map((product) => {
      const card = el('li', 'product-card');
      card.dataset.productId = product.id;
      const saved = wishlistIds.has(product.id);
      const button = el('button', '', saved ? 'In wishlist' : 'Add to wishlist');
      button.type = 'button';
      button.disabled = saved;
      button.addEventListener('click', () => addToWishlist(product.id));
      card.append(
        el('h3', 'product-name', product.name),
        el('p', 'product-description', product.description),
        el('p', 'product-price', formatPrice(product.price)),
        button,
      );
      return card;
    }),
  );
  productsStatus.hidden = products.length > 0;
  productsStatus.textContent = 'No products yet.';
}

function renderWishlist(items) {
  wishlistIds = new Set(items.map((item) => item.productId));
  renderProducts();
  wishlistList.replaceChildren(
    ...items.map((item) => {
      const row = el('li', 'wishlist-item');
      row.dataset.productId = item.productId;
      row.append(
        el('span', 'wishlist-name', item.product.name),
        el('span', 'wishlist-price', formatPrice(item.product.price)),
      );
      return row;
    }),
  );
  wishlistStatus.hidden = items.length > 0;
  wishlistStatus.textContent = 'Your wishlist is empty.';
}

async function load() {
  try {
    const [{ products: loaded }, { items }] = await Promise.all([
      getJson('/api/products'),
      getJson('/api/wishlist'),
    ]);
    products = loaded;
    renderWishlist(items);
  } catch (err) {
    console.error(err);
    productsStatus.textContent = 'Could not load the shop. Please refresh.';
    wishlistStatus.textContent = '';
  }
}

load();
