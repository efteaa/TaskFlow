import { validateOrder, mergeOrders } from './lib/orders.js';
import { importOrdersCsv, exportOrdersCsv } from './lib/csv.js';
import { evaluateOrder, summarize, groupOrders, dailyRevenue, scenario, filterOrders, rupiah, number, percent } from './lib/analytics.js';
import { loadOrders, saveOrders } from './lib/storage.js';
import { sampleOrders } from './lib/sample.js';

const initial = loadOrders();
const state = {
  orders: initial.orders,
  sample: initial.sample,
  page: 'overview',
  month: 'All',
  filters: { query: '', channel: 'All', status: 'All' },
  sim: { price: 175000, cost: 70000, feeRate: 16, discount: 10000, ads: 18000, shipping: 5000 }
};
const root = document.querySelector('#app');

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[ch]);
const opt = (value, selected, label = value) =>
  '<option value="' + esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + esc(label) + '</option>';
const dateLabel = date => new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const cashClass = amount => amount < 0 ? 'red' : 'green';

function notify(message) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 5500);
}

function months() {
  return [...new Set(state.orders.map(row => row.date.slice(0, 7)))].sort().reverse();
}

function reportOrders() {
  return filterOrders(state.orders, { month: state.month });
}

function card(title, value, foot, className = '') {
  return '<article class="card kpi"><div class="kpi-label">' + title +
    '</div><div class="kpi-value ' + className + '">' + value +
    '</div><div class="kpi-bottom">' + foot + '</div></article>';
}

function chart(orders) {
  const days = dailyRevenue(orders).slice(-14);
  if (!days.length) return '<div class="empty">No sales to chart for this period.</div>';
  const max = Math.max(1, ...days.map(day => day.revenue));
  const width = 700; const left = 24; const right = width - 24;
  const points = days.map((day, index) => ({
    x: days.length === 1 ? width / 2 : left + index * (right - left) / (days.length - 1),
    y: 185 - (day.revenue / max) * 146
  }));
  const coords = points.map(point => point.x.toFixed(1) + ',' + point.y.toFixed(1)).join(' ');
  const first = points[0]; const last = points[points.length - 1];
  const area = 'M ' + first.x + ' 185 L ' +
    points.map(point => point.x.toFixed(1) + ' ' + point.y.toFixed(1)).join(' L ') +
    ' L ' + last.x + ' 185 Z';
  const grid = [39, 88, 136, 185].map(y =>
    '<line x1="20" y1="' + y + '" x2="680" y2="' + y + '" stroke="#edf0f6" stroke-dasharray="4 5"/>'
  ).join('');
  return '<div class="chart"><svg viewBox="0 0 700 205" role="img" aria-label="Revenue trend">' +
    grid + '<path d="' + area + '" fill="#dae7ff" opacity=".7"/>' +
    '<polyline points="' + coords + '" stroke="#5278ed" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<circle cx="' + last.x + '" cy="' + last.y + '" r="5" fill="#5278ed" stroke="white" stroke-width="3"/></svg>' +
    '<div class="chart-labels"><span>' + dateLabel(days[0].name) + '</span>' +
    '<span>Peak ' + rupiah(max) + '</span><span>' + dateLabel(days[days.length - 1].name) + '</span></div></div>';
}

function statusChip(status) {
  return '<span class="status ' + status + '">' + (status === 'cancelled' ? 'Cancelled' : status === 'returned' ? 'Returned' : 'Completed') + '</span>';
}

function rowsTable(orders, showMore = false) {
  const data = [...orders].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  if (!data.length) return '<div class="empty">No orders match these filters. Try a different period or import a CSV.</div>';
  const visible = data.slice(0, showMore ? 100 : 7);
  return '<div class="table-wrap"><table><thead><tr><th>Order / Date</th><th>Product</th><th>Channel</th><th>Qty</th><th>Status</th><th>Revenue</th><th>Profit</th></tr></thead><tbody>' +
    visible.map(order => {
      const value = evaluateOrder(order);
      return '<tr><td><strong>' + esc(order.id) + '</strong><div class="muted tiny">' + dateLabel(order.date) + '</div></td>' +
        '<td><strong class="product-name">' + esc(order.product) + '</strong><div class="muted tiny">' + esc(order.sku || '—') + '</div></td>' +
        '<td>' + esc(order.channel) + '</td><td>' + number(order.quantity) + '</td>' +
        '<td>' + statusChip(order.status) + '</td><td>' + rupiah(value.revenue) + '</td>' +
        '<td class="' + cashClass(value.profit) + '"><strong>' + rupiah(value.profit) + '</strong></td></tr>';
    }).join('') +
    '</tbody></table></div>' +
    (data.length > visible.length ? '<p class="muted small" style="padding:0 18px">Showing first ' + visible.length + ' of ' + data.length + ' orders. Export CSV to view all records.</p>' : '');
}

function overview() {
  const filtered = reportOrders();
  const stats = summarize(filtered);
  const channels = groupOrders(filtered, order => order.channel);
  const maxRevenue = Math.max(1, ...channels.map(channel => channel.revenue));
  return '<div class="grid kpis">' +
    card('Net sales', rupiah(stats.revenue), number(stats.completed) + ' completed orders') +
    card('Net profit', rupiah(stats.profit), percent(stats.margin) + ' profit margin', cashClass(stats.profit)) +
    card('Units sold', number(stats.units), number(stats.returned) + ' returned orders') +
    card('Ad efficiency', stats.roas === null ? '—' : stats.roas.toFixed(2) + '×', rupiah(stats.ads) + ' attributed spend') +
    '</div><div class="split">' +
    '<article class="card card-pad"><div class="card-head"><div><h2>Sales performance</h2><p>Completed-order revenue by day</p></div><span class="line-legend">● Revenue</span></div>' +
    chart(filtered) + '</article>' +
    '<article class="card card-pad"><div class="card-head"><div><h2>Sales channels</h2><p>Contribution to total revenue</p></div></div>' +
    (channels.length ? channels.sort((a,b)=>b.revenue-a.revenue).map(ch =>
      '<div class="channel"><div class="channel-line"><span class="channel-name"><span class="dot"></span>' + esc(ch.name) + '</span>' +
      '<strong>' + rupiah(ch.revenue) + '</strong></div>' +
      '<div class="track"><div class="fill" style="width:' + Math.min(100, ch.revenue / maxRevenue * 100).toFixed(1) + '%"></div></div>' +
      '<div class="metric-line small"><span>' + number(ch.completed) + ' orders</span><span class="' + cashClass(ch.profit) + '">' + rupiah(ch.profit) + ' profit</span></div></div>'
    ).join('') : '<div class="empty">No channel activity for this period.</div>') +
    '</article></div>' +
    '<div class="section-bar"><h2>Recent orders</h2><button class="inline-link" data-page="orders">View all orders →</button></div>' +
    '<div class="card">' + rowsTable(filtered) + '</div>';
}

function ordersPage() {
  const filtered = filterOrders(reportOrders(), state.filters);
  return '<div class="notice">Import a CSV with order ID, date, product, quantity, unit price and unit cost. Optional columns include channel, discounts, seller fees, advertising and shipping subsidy. <button class="inline-link" data-action="download-example">Download example CSV</button>.</div>' +
    '<div class="card"><div class="filters">' +
    '<input class="field search" id="search" placeholder="Search order, product or SKU" value="' + esc(state.filters.query) + '" aria-label="Search orders">' +
    '<select class="field" id="channel-filter" aria-label="Channel filter">' +
    ['All','Shopee','TikTok','Other'].map(name => opt(name, state.filters.channel)).join('') + '</select>' +
    '<select class="field" id="status-filter" aria-label="Status filter">' +
    ['All','completed','returned','cancelled'].map(name => opt(name, state.filters.status)).join('') + '</select>' +
    '<button class="btn primary" data-action="open-add">+ Add order</button></div>' +
    '<div class="section-bar" style="padding:0 18px"><h2>' + number(filtered.length) + ' orders</h2><span class="muted tiny">Showing up to 100</span></div>' +
    rowsTable(filtered, true) + '</div>';
}

function productsPage() {
  const products = groupOrders(reportOrders(), row => row.sku || row.product).sort((a, b) => b.profit - a.profit);
  return '<div class="notice">Product-level results are based on imported cost and fee fields. A profitable sales channel can still contain loss-making products.</div>' +
    '<div class="card">' + (products.length
    ? '<div class="table-wrap"><table><thead><tr><th>Product / SKU</th><th>Orders</th><th>Units</th><th>Revenue</th><th>Costs + fees + ads</th><th>Margin</th><th>Profit</th></tr></thead><tbody>' +
      products.map(p => '<tr><td><strong>' + esc(reportOrders().find(o => (o.sku || o.product) === p.name)?.product || p.name) +
      '</strong><div class="muted tiny">' + esc(p.name) + '</div></td>' +
      '<td>' + number(p.orders) + '</td><td>' + number(p.units) + '</td><td>' + rupiah(p.revenue) + '</td>' +
      '<td>' + rupiah(p.cogs + p.fee + p.ads + p.shipping) + '</td><td>' + percent(p.margin) + '</td>' +
      '<td class="' + cashClass(p.profit) + '"><strong>' + rupiah(p.profit) + '</strong></td></tr>').join('') +
      '</tbody></table></div>' : '<div class="empty">No products in this period.</div>') + '</div>';
}

function simulatorOutput() {
  const result = scenario(state.sim);
  return '<div class="sim-profit"><div class="eyebrow">Estimated profit per item</div>' +
    '<div class="amount ' + cashClass(result.profit) + '">' + rupiah(result.profit) + '</div>' +
    '<span class="muted small">Margin ' + percent(result.margin) + '</span></div>' +
    '<div class="metric-line"><span>Sales after discount</span><strong>' + rupiah(result.netSales) + '</strong></div>' +
    '<div class="metric-line"><span>Platform fees</span><strong>' + rupiah(result.fee) + '</strong></div>' +
    '<div class="metric-line"><span>Cost + ads + shipping</span><strong>' + rupiah(Number(state.sim.cost) + Number(state.sim.ads) + Number(state.sim.shipping)) + '</strong></div>' +
    '<div class="metric-line"><span>Break-even list price</span><strong>' + rupiah(result.breakEven) + '</strong></div>';
}

function simulator() {
  const fields = [
    ['price','Selling price (Rp)'], ['cost','Cost / HPP (Rp)'], ['discount','Seller discount (Rp)'],
    ['feeRate','Marketplace fee (%)'], ['ads','Ad spend per item (Rp)'], ['shipping','Shipping subsidy (Rp)']
  ];
  return '<div class="notice">Use this calculator to test a potential selling price. Values here are estimates, not actual marketplace settlement data.</div>' +
    '<div class="sim-layout"><div class="card card-pad"><div class="card-head"><div><h2>Price simulator</h2><p>Find your contribution margin before listing a product</p></div></div>' +
    '<div class="form-grid">' + fields.map(([key, label]) =>
      '<div class="form-control"><label for="sim-' + key + '">' + label + '</label>' +
      '<input class="field sim-input" type="number" min="0" step="any" id="sim-' + key + '" data-field="' + key + '" value="' + state.sim[key] + '"></div>'
    ).join('') + '</div></div><div class="card card-pad"><h2>Unit economics</h2><p class="muted small">Estimated outcome from your inputs</p>' +
    '<div id="sim-output">' + simulatorOutput() + '</div></div></div>';
}

function orderDialog() {
  const fields = [
    ['id','Order ID','text','ORD-1001'],['date','Order date','date',''],['product','Product name','text','Example Sandal'],
    ['sku','SKU','text','SKU-001'],['quantity','Quantity','number','1'],
    ['unitPrice','Unit price (Rp)','number','150000'], ['unitCost','Unit cost / HPP (Rp)','number','70000'],
    ['discount','Discount (Rp)','number','0'],['feeRate','Fee rate (%)','number','12'],
    ['adSpend','Ad spend (Rp)','number','0'],['shippingCost','Shipping subsidy (Rp)','number','0']
  ];
  return '<dialog id="order-dialog"><div class="dialog-inner"><div class="dialog-top"><h2>Add a sale</h2>' +
    '<button class="icon-button" data-action="close-dialog" aria-label="Close">×</button></div>' +
    '<p class="muted small">Amounts are in IDR. Add one order or import many from CSV.</p>' +
    '<form id="add-order-form"><div class="form-grid">' +
    fields.map(([key,label,type,placeholder]) => '<div class="form-control">' +
      '<label for="new-' + key + '">' + label + '</label>' +
      '<input class="field" id="new-' + key + '" name="' + key + '" type="' + type + '" ' +
      (type === 'number' ? 'min="0" step="any" ' : '') + 'placeholder="' + placeholder + '" ' +
      (key === 'id'||key === 'date'||key === 'product'||key === 'quantity'||key === 'unitPrice'||key === 'unitCost' ? 'required ' : '') +
      (type === 'number' && placeholder !== '' ? 'value="' + placeholder + '" ' : '') +
      (key === 'date' ? 'value="' + new Date().toISOString().slice(0,10) + '" ' : '') + '></div>'
    ).join('') +
    '<div class="form-control"><label for="new-channel">Channel</label><select class="field" name="channel" id="new-channel"><option>Shopee</option><option>TikTok</option><option>Other</option></select></div>' +
    '<div class="form-control"><label for="new-status">Status</label><select class="field" name="status" id="new-status"><option value="completed">Completed</option><option value="returned">Returned</option><option value="cancelled">Cancelled</option></select></div>' +
    '</div><p id="form-error" class="red small" role="alert"></p><div class="dialog-actions">' +
    '<button type="button" class="btn" data-action="close-dialog">Cancel</button>' +
    '<button type="submit" class="btn primary">Save order</button></div></form></div></dialog>';
}

function render() {
  const labels = { overview: ['Overview', 'Your marketplace performance at a glance'],
    orders: ['Orders', 'Search, import and manage transaction records'],
    products: ['Products', 'Profitability by item and SKU'],
    simulator: ['Price simulator', 'Plan margins before you launch'] };
  const [title, subtitle] = labels[state.page];
  const navItems = [['overview','◫','Overview'],['orders','≡','Orders'],['products','▦','Products'],['simulator','◈','Price simulator']];
  root.innerHTML = '<div class="layout"><aside class="sidebar">' +
    '<div class="brand"><span class="brand-mark">M</span>MarketplaceOps</div>' +
    '<div class="nav-title">WORKSPACE</div><nav class="nav" aria-label="Main navigation">' +
    navItems.map(([id,glyph,label]) => '<button data-page="' + id + '" class="' + (id === state.page ? 'active' : '') + '">' +
      '<span class="glyph">' + glyph + '</span>' + label + '</button>').join('') + '</nav>' +
    '<div class="side-note"><strong>Local-first workspace</strong><span class="tiny">Your imports stay in this browser. No login, server upload or real marketplace integration.</span></div></aside>' +
    '<main class="main"><header class="topbar"><div><div class="eyebrow">SELLER WORKSPACE</div><h1>' + title + '</h1><p class="page-subtitle">' + subtitle + '</p></div>' +
    '<div class="actions"><select id="month" class="field" aria-label="Reporting month">' +
    opt('All', state.month, 'All periods') + months().map(month => opt(month, state.month)).join('') + '</select>' +
    '<button class="btn" data-action="export">↓ Export CSV</button>' +
    '<button class="btn primary" data-action="import">↑ Import CSV</button>' +
    '<input type="file" id="csv-file" class="file-input" accept=".csv,text/csv"></div></header>' +
    (state.sample ? '<div class="notice warning"><strong>Demo mode:</strong> All transactions are fictional examples. Your first import replaces the demo data. <button class="inline-link" data-action="clear">Start with empty workspace</button>.</div>' : '') +
    (state.page === 'overview' ? overview() : state.page === 'orders' ? ordersPage() :
      state.page === 'products' ? productsPage() : simulator()) +
    '<footer class="footer"><button class="inline-link" data-action="reset">Reload demo</button> · No external API calls · IDR reporting · v0.1</footer>' +
    '</main></div>' + orderDialog();
}

function downloadCsv(text, filename) {
  const blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function updateOrders(orders) {
  state.orders = orders; state.sample = false;
  if (!saveOrders(orders)) notify('Could not save to browser storage. Data may not persist.');
  render();
}

root.addEventListener('click', event => {
  const nav = event.target.closest('[data-page]');
  if (nav) { state.page = nav.dataset.page; render(); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  switch (button.dataset.action) {
    case 'import': document.querySelector('#csv-file')?.click(); break;
    case 'export': downloadCsv(exportOrdersCsv(state.orders), 'marketplaceops-orders.csv'); break;
    case 'download-example': downloadCsv(exportOrdersCsv(sampleOrders.slice(0, 4)), 'marketplaceops-example.csv'); break;
    case 'open-add': document.querySelector('#order-dialog')?.showModal(); break;
    case 'close-dialog': document.querySelector('#order-dialog')?.close(); break;
    case 'clear':
      if (confirm('Start with an empty workspace? Demo data will be removed.')) updateOrders([]);
      break;
    case 'reset':
      if (confirm('Replace your saved orders with fictional demo data? Export first if you want a backup.')) {
        updateOrders(sampleOrders); state.sample = true; render();
      }
      break;
  }
});

root.addEventListener('change', event => {
  const target = event.target;
  if (target.id === 'month') { state.month = target.value; render(); }
  if (target.id === 'channel-filter') { state.filters.channel = target.value; render(); }
  if (target.id === 'status-filter') { state.filters.status = target.value; render(); }
  if (target.id === 'search') { state.filters.query = target.value; render(); }
  if (target.id === 'csv-file' && target.files?.[0]) {
    const file = target.files[0];
    if (file.size > 5 * 1024 * 1024) { notify('CSV is too large (5 MB maximum).'); return; }
    file.text().then(text => {
      const result = importOrdersCsv(text);
      if (result.error) { notify(result.error); return; }
      const prior = state.sample ? [] : state.orders;
      const merged = mergeOrders(prior, result.orders);
      updateOrders(merged.orders);
      notify(merged.added + ' imported, ' + merged.duplicates + ' duplicate(s), ' +
        result.rejected.length + ' invalid row(s).' +
        (result.rejected.length ? ' First error: line ' + result.rejected[0].line + ' — ' + result.rejected[0].reason : ''));
    }).catch(() => notify('Could not read the CSV file.'));
  }
});

root.addEventListener('input', event => {
  const target = event.target;
  if (!target.classList.contains('sim-input')) return;
  state.sim[target.dataset.field] = Number(target.value) || 0;
  document.querySelector('#sim-output').innerHTML = simulatorOutput();
});

root.addEventListener('submit', event => {
  if (event.target.id !== 'add-order-form') return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  const checked = validateOrder(data);
  if (!checked.ok) {
    document.querySelector('#form-error').textContent = checked.issues.join('; '); return;
  }
  const base = state.sample ? [] : state.orders;
  const merged = mergeOrders(base, [checked.order]);
  if (!merged.added) {
    document.querySelector('#form-error').textContent = 'Order ID already exists for that marketplace.'; return;
  }
  updateOrders(merged.orders);
  state.page = 'orders';
  render();
  notify('Order saved.');
});

render();
