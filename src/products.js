// The shop's catalogue. Prices are in cents to avoid rounding errors.
export const products = [
  { id: 'p1', name: 'Ceramic Mug', price: 1800, description: 'Hand-glazed, holds 350 ml.' },
  { id: 'p2', name: 'Linen Tote Bag', price: 2400, description: 'Sturdy and washable.' },
  { id: 'p3', name: 'Desk Plant', price: 3200, description: 'A small pothos in a clay pot.' },
  { id: 'p4', name: 'Notebook Set', price: 1500, description: 'Three dotted A5 notebooks.' },
  { id: 'p5', name: 'Wool Socks', price: 1200, description: 'Warm, soft, one size.' },
  { id: 'p6', name: 'Scented Candle', price: 2800, description: 'Cedar and orange, 40 hours.' },
  { id: 'p7', name: 'Bamboo Cutting Board', price: 3500, description: 'Large, with a juice groove.' },
  { id: 'p8', name: 'Enamel Pin', price: 900, description: 'A tiny gold-plated wish star.' },
];

export function findProduct(id) {
  return products.find((p) => p.id === id) ?? null;
}
