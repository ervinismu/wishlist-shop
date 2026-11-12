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
