// Read-only shared wishlist page. Set text with textContent, never innerHTML.

const list = document.getElementById('shared-list');
const status = document.getElementById('shared-status');

function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

async function load() {
  try {
    const token = window.location.pathname.split('/').pop();
    const res = await fetch(`/api/shared/${encodeURIComponent(token)}`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const { items, total } = await res.json();
    list.replaceChildren(
      ...items.map((item) => {
        const row = el('li', 'wishlist-item');
        row.append(
          el('span', 'wishlist-name', item.product.name),
          el('span', 'wishlist-qty-text', `× ${item.quantity}`),
          el('span', 'wishlist-price', formatPrice(item.product.price * item.quantity)),
        );
        return row;
      }),
    );
    document.getElementById('shared-total').textContent = total > 0 ? `Total: ${formatPrice(total)}` : '';
    status.hidden = items.length > 0;
    status.textContent = 'This wishlist is empty.';
  } catch (err) {
    console.error(err);
    status.hidden = false;
    status.textContent = "This wishlist couldn't be loaded. Please refresh.";
  }
}

load();
