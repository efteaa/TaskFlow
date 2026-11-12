export const rupiah = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
export const number = value => new Intl.NumberFormat('id-ID').format(value);
export const percent = value => Number.isFinite(value) ? (value * 100).toFixed(1) + '%' : '—';

export function evaluateOrder(order) {
  // Revenue, fees and COGS are recognized for completed orders only.
  // Returned and cancelled orders may still incur advertising/logistics costs.
  const completed = order.status === 'completed';
  const itemTotal = completed ? order.quantity * order.unitPrice : 0;
  const discount = completed ? order.discount : 0;
  const revenue = Math.max(0, itemTotal - discount);
  const fee = completed ? (order.fee === null ? revenue * (order.feeRate / 100) : order.fee) : 0;
  const cogs = completed ? order.quantity * order.unitCost : 0;
  const ads = order.adSpend;
  const shipping = order.shippingCost;
  const profit = revenue - fee - cogs - ads - shipping;
  return { itemTotal, discount, revenue, fee, cogs, ads, shipping, profit, units: completed ? order.quantity : 0 };
}

export function summarize(orders) {
  const base = { orders: orders.length, completed: 0, returned: 0, cancelled: 0, units: 0,
    itemTotal: 0, discount: 0, revenue: 0, fee: 0, cogs: 0, ads: 0, shipping: 0, profit: 0 };
  for (const order of orders) {
    base[order.status] += 1;
    const evaluated = evaluateOrder(order);
    for (const key of ['units', 'itemTotal', 'discount', 'revenue', 'fee', 'cogs', 'ads', 'shipping', 'profit']) {
      base[key] += evaluated[key];
    }
  }
  return { ...base, margin: base.revenue ? base.profit / base.revenue : 0,
    aov: base.completed ? base.revenue / base.completed : 0,
    roas: base.ads ? base.revenue / base.ads : null,
    returnRate: base.orders ? base.returned / base.orders : 0 };
}

export function groupOrders(orders, getKey) {
  const groups = new Map();
  for (const order of orders) {
    const key = getKey(order);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(order);
  }
  return [...groups.entries()].map(([name, entries]) => ({ name, ...summarize(entries) }));
}

export function dailyRevenue(orders) {
  return groupOrders(orders, order => order.date).sort((a, b) => a.name.localeCompare(b.name));
}

export function scenario(input) {
  const price = Math.max(0, Number(input.price) || 0);
  const cost = Math.max(0, Number(input.cost) || 0);
  const discount = Math.max(0, Number(input.discount) || 0);
  const feeRate = Math.max(0, Math.min(99.9, Number(input.feeRate) || 0)) / 100;
  const ads = Math.max(0, Number(input.ads) || 0);
  const shipping = Math.max(0, Number(input.shipping) || 0);
  const netSales = Math.max(0, price - discount);
  const fee = netSales * feeRate;
  const profit = netSales - fee - cost - ads - shipping;
  const breakEven = discount + (cost + ads + shipping) / (1 - feeRate);
  return { netSales, fee, profit, margin: netSales ? profit / netSales : 0,
    breakEven, contribution: profit, feeRate };
}

export function filterOrders(orders, { query = '', channel = 'All', month = 'All', status = 'All' } = {}) {
  const term = query.toLowerCase().trim();
  return orders.filter(order =>
    (channel === 'All' || order.channel === channel) &&
    (month === 'All' || order.date.slice(0, 7) === month) &&
    (status === 'All' || order.status === status) &&
    (!term || [order.id, order.product, order.sku].some(field => field.toLowerCase().includes(term)))
  );
}
