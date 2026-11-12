import { validateOrder } from './orders.js';
import { sampleOrders } from './sample.js';

const KEY = 'marketplaceops:orders:v1';
export function loadOrders() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return { orders: sampleOrders, sample: true };
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('Invalid saved data');
    const orders = data.map(validateOrder).filter(row => row.ok).map(row => row.order);
    return { orders, sample: false };
  } catch {
    return { orders: sampleOrders, sample: true };
  }
}
export function saveOrders(orders) {
  try { localStorage.setItem(KEY, JSON.stringify(orders)); return true; }
  catch { return false; }
}
