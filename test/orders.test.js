import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, parseDate, validateOrder, mergeOrders, normalizeStatus } from '../src/lib/orders.js';

const base = { id: 'S-100', date: '2026-11-12', channel: 'Shopee', product: 'Sandals',
  quantity: 2, unitPrice: 150000, unitCost: 70000, discount: 0, feeRate: 15, adSpend: 10000, shippingCost: 5000 };

test('parses Indonesian thousands formatting and decimal conventions', () => {
  assert.equal(parseAmount('Rp 150.000'), 150000);
  assert.equal(parseAmount('1.250,50'), 1250.5);
  assert.equal(parseAmount('1,250.50'), 1250.5);
  assert.equal(parseAmount('15%'), 15);
  assert.ok(Number.isNaN(parseAmount('not a number')));
});

test('dates are validated and normalized consistently', () => {
  assert.equal(parseDate('12/11/2026'), '2026-11-12');
  assert.equal(parseDate('12-11-2026'), '2026-11-12');
  assert.equal(parseDate('2026-02-30'), null);
  assert.equal(parseDate('31/11/2026'), null);
});

test('validates costs, quantity and discounts before adding orders', () => {
  assert.equal(validateOrder(base).ok, true);
  assert.equal(validateOrder({ ...base, quantity: 0 }).ok, false);
  assert.equal(validateOrder({ ...base, discount: 350000 }).ok, false);
  assert.equal(validateOrder({ ...base, unitCost: -1 }).ok, false);
  assert.equal(normalizeStatus('retur'), 'returned');
});

test('preserves a missing optional fee through save and load normalization', () => {
  const first = validateOrder(base);
  assert.equal(first.order.fee, null);
  const second = validateOrder(first.order);
  assert.equal(second.order.fee, null);
});

test('deduplicates by marketplace and order ID, not order ID alone', () => {
  const first = validateOrder(base).order;
  const second = validateOrder({ ...base, channel: 'TikTok' }).order;
  const merged = mergeOrders([first], [first, second]);
  assert.equal(merged.added, 1);
  assert.equal(merged.duplicates, 1);
  assert.equal(merged.orders.length, 2);
});
