import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateOrder, summarize, scenario, filterOrders, groupOrders } from '../src/lib/analytics.js';
import { validateOrder } from '../src/lib/orders.js';

const make = changes => validateOrder({ id:'O-1', date:'2026-11-12', channel:'Shopee',
  product:'Platform', sku:'SKU-1', quantity:2, unitPrice:200000, unitCost:90000,
  discount:20000, feeRate:10, adSpend:10000, shippingCost:5000,
  status:'completed', ...changes }).order;

test('profit subtracts discounts, COGS, fees, ads and shipping', () => {
  const p = evaluateOrder(make({}));
  assert.equal(p.revenue, 380000);
  assert.equal(p.fee, 38000);
  assert.equal(p.cogs, 180000);
  assert.equal(p.profit, 147000);
});

test('retur and cancelled orders have zero recognized sales but may incur costs', () => {
  const p = evaluateOrder(make({ status:'returned' }));
  assert.equal(p.revenue, 0);
  assert.equal(p.cogs, 0);
  assert.equal(p.profit, -15000);
});

test('aggregated margin uses total revenue, not average order margin', () => {
  const summary = summarize([make({}), make({ id:'O-2', channel:'TikTok', status:'returned' })]);
  assert.equal(summary.profit, 132000);
  assert.equal(summary.orders, 2);
  assert.equal(summary.returned, 1);
  assert.equal(summary.margin, 132000 / 380000);
  assert.equal(summary.roas, 380000 / 20000);
});

test('scenario break-even price yields zero contribution', () => {
  const input = { price:175000, cost:70000, discount:10000, feeRate:20, ads:16000, shipping:4000 };
  const result = scenario(input);
  assert.equal(result.breakEven, 122500);
  assert.equal(result.profit, 42000);
  assert.ok(Math.abs(scenario({ ...input, price: result.breakEven }).profit) < 0.000001);
});

test('filters can combine month, channel and search', () => {
  const all = [make({}), make({ id:'O-2', date:'2026-10-02', channel:'TikTok' })];
  assert.equal(filterOrders(all, { month:'2026-11', channel:'Shopee', query:'platform' }).length, 1);
  assert.equal(groupOrders(all, row => row.channel).length, 2);
});
