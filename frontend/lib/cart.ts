export type CartItem = { listingId: number; title?: string; price_per_unit?: number; quantity: number };
const KEY = "agri_cart_v1";

export function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch (e) {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  const exists = cart.find((c) => c.listingId === item.listingId);
  if (exists) {
    exists.quantity = Number(exists.quantity) + Number(item.quantity);
  } else {
    cart.push(item);
  }
  saveCart(cart);
}

export function removeFromCart(listingId: number) {
  const cart = getCart().filter((i) => i.listingId !== listingId);
  saveCart(cart);
}

export function clearCart() {
  localStorage.removeItem(KEY);
}

export function updateQuantity(listingId: number, quantity: number) {
  const cart = getCart();
  const idx = cart.findIndex((c) => c.listingId === listingId);
  if (idx === -1) return;
  if (Number(quantity) <= 0) {
    // remove if non-positive
    cart.splice(idx, 1);
  } else {
    cart[idx].quantity = Number(quantity);
  }
  saveCart(cart);
}
