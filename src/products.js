// The shop's catalogue. Prices are in cents to avoid rounding errors.
export const products = [
  { id: 'p1', name: 'Ceramic Mug', category: 'Kitchen', price: 1800, description: 'Hand-glazed, holds 350 ml.' },
  { id: 'p2', name: 'Linen Tote Bag', category: 'Accessories', price: 2400, description: 'Sturdy and washable.' },
  { id: 'p3', name: 'Desk Plant', category: 'Home', price: 3200, description: 'A small pothos in a clay pot.' },
  { id: 'p4', name: 'Notebook Set', category: 'Stationery', price: 1500, description: 'Three dotted A5 notebooks.' },
  { id: 'p5', name: 'Wool Socks', category: 'Clothing', price: 1200, description: 'Warm, soft, one size.' },
  { id: 'p6', name: 'Scented Candle', category: 'Home', price: 2800, description: 'Cedar and orange, 40 hours.' },
  { id: 'p7', name: 'Bamboo Cutting Board', category: 'Kitchen', price: 3500, description: 'Large, with a juice groove.' },
  { id: 'p8', name: 'Enamel Pin', category: 'Accessories', price: 900, description: 'A tiny gold-plated wish star.' },
];

// Category names, sorted A to Z.
export const categories = [...new Set(products.map((p) => p.category))].sort();

export function findProduct(id) {
  return products.find((p) => p.id === id) ?? null;
}

// Discounts are fixed here. `target` is a product id (`productId`) or a whole `category`.
// A discount is active from `startsAt` (inclusive) until `endsAt` (exclusive), as ISO dates/times (UTC).
// Several active discounts on one product (its own and its category's) are added together, up to 100%.
export const discounts = [
  { category: 'Kitchen', percent: 20, startsAt: '2026-11-01', endsAt: '2026-12-01' },
  { productId: 'p3', percent: 10, startsAt: '2026-11-15', endsAt: '2026-12-15' },
];

// Total percent off for a product at a moment in time (0 to 100).
export function discountPercent(product, now = new Date(), list = discounts) {
  const time = now.getTime();
  const total = list
    .filter((d) => (d.productId !== undefined ? d.productId === product.id : d.category === product.category))
    .filter((d) => time >= Date.parse(d.startsAt) && time < Date.parse(d.endsAt))
    .reduce((sum, d) => sum + d.percent, 0);
  return Math.min(total, 100);
}

// Price in cents after taking a percent off, rounded up to the next whole cent.
export function discountedPrice(price, percent) {
  return Math.floor((price * (100 - percent) + 99) / 100);
}

// The product plus `discountPercent` and `salePrice` (cents; equals `price` when no discount).
export function withDiscount(product, now = new Date(), list = discounts) {
  const percent = discountPercent(product, now, list);
  return { ...product, discountPercent: percent, salePrice: discountedPrice(product.price, percent) };
}
