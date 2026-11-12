/**
 * Normalized sales model:
 * id, date (YYYY-MM-DD), channel, product, sku, quantity, unitPrice,
 * unitCost, discount, fee, feeRate, adSpend, shippingCost, status.
 * Amounts are Indonesian rupiah. No marketplace credentials are used.
 */
export const CHANNELS = ['Shopee', 'TikTok', 'Other'];
export const STATUSES = ['completed', 'returned', 'cancelled'];

export function parseAmount(value, fallback = 0) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  let raw = String(value).trim().replace(/rp\s*/gi, '').replace(/\s/g, '');
  const negative = /^-/.test(raw);
  raw = raw.replace(/[^\d.,]/g, '');
  if (!raw) return NaN;
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    const decimal = lastComma > lastDot ? ',' : '.';
    const thousands = decimal === ',' ? '.' : ',';
    raw = raw.split(thousands).join('').replace(decimal, '.');
  } else if (lastComma !== -1) {
    raw = /^\d{1,3}(,\d{3})+$/.test(raw) ? raw.replace(/,/g, '') : raw.replace(',', '.');
  } else if (lastDot !== -1) {
    raw = /^\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw;
  }
  const amount = Number(raw);
  return negative ? -amount : amount;
}

export function parseDate(value) {
  const raw = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(raw + 'T12:00:00Z');
    return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw ? null : raw;
  }
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]); const month = Number(match[2]); const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) return null;
  return date.toISOString().slice(0, 10);
}

export function normalizeChannel(value) {
  const label = String(value ?? '').trim().toLowerCase();
  if (label.includes('shopee')) return 'Shopee';
  if (label.includes('tiktok') || label.includes('tik tok')) return 'TikTok';
  return 'Other';
}

export function normalizeStatus(value) {
  const status = String(value ?? 'completed').toLowerCase().trim();
  if (['returned', 'return', 'refund', 'retur', 'dikembalikan'].includes(status)) return 'returned';
  if (['cancelled', 'canceled', 'cancel', 'batal', 'dibatalkan'].includes(status)) return 'cancelled';
  if (['completed', 'complete', 'delivered', 'selesai', 'delivered & completed', ''].includes(status)) return 'completed';
  return null;
}

export function validateOrder(candidate) {
  const issues = [];
  const id = String(candidate.id ?? '').trim();
  const date = parseDate(candidate.date);
  const product = String(candidate.product ?? '').trim();
  const sku = String(candidate.sku ?? '').trim();
  const channel = normalizeChannel(candidate.channel);
  const status = normalizeStatus(candidate.status);
  const quantity = parseAmount(candidate.quantity, NaN);
  const unitPrice = parseAmount(candidate.unitPrice, NaN);
  const unitCost = parseAmount(candidate.unitCost, NaN);
  const discount = parseAmount(candidate.discount);
  const fee = candidate.fee === undefined || String(candidate.fee).trim() === '' ? null : parseAmount(candidate.fee);
  const feeRate = parseAmount(candidate.feeRate);
  const adSpend = parseAmount(candidate.adSpend);
  const shippingCost = parseAmount(candidate.shippingCost);
  if (!id) issues.push('missing order ID');
  if (!date) issues.push('invalid date');
  if (!product) issues.push('missing product');
  if (!Number.isInteger(quantity) || quantity < 1) issues.push('quantity must be a positive integer');
  for (const [key, value] of Object.entries({ unitPrice, unitCost, discount, feeRate, adSpend, shippingCost })) {
    if (!Number.isFinite(value) || value < 0) issues.push('invalid ' + key);
  }
  if (fee !== null && (!Number.isFinite(fee) || fee < 0)) issues.push('invalid fee');
  if (feeRate > 100) issues.push('fee rate cannot exceed 100%');
  if (!status) issues.push('unknown status');
  if (Number.isFinite(quantity * unitPrice) && discount > quantity * unitPrice) issues.push('discount exceeds item total');
  if (issues.length) return { ok: false, issues };
  return { ok: true, order: { id, date, channel, product, sku,
    quantity, unitPrice, unitCost, discount, fee, feeRate, adSpend, shippingCost, status } };
}

export function orderKey(order) {
  return order.channel + ':' + order.id;
}

export function mergeOrders(existing, incoming) {
  const found = new Set(existing.map(orderKey));
  const added = [];
  let duplicates = 0;
  for (const order of incoming) {
    const key = orderKey(order);
    if (found.has(key)) { duplicates += 1; continue; }
    found.add(key);
    added.push(order);
  }
  return { orders: [...existing, ...added], added: added.length, duplicates };
}
