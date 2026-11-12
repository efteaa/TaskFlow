import { validateOrder } from './orders.js';

const FIELDS = {
  id: ['order id', 'order_id', 'order number', 'order no', 'nomor pesanan', 'id pesanan', 'id'],
  date: ['date', 'order date', 'tanggal', 'tanggal pesanan', 'tanggal order'],
  channel: ['channel', 'platform', 'marketplace', 'sales channel'],
  product: ['product', 'product name', 'nama produk', 'nama barang', 'item'],
  sku: ['sku', 'seller sku', 'sku induk', 'kode produk'],
  quantity: ['qty', 'quantity', 'jumlah', 'jumlah produk', 'jumlah produk terjual', 'units'],
  unitPrice: ['unit price', 'unitprice', 'price', 'harga jual', 'harga', 'sale price'],
  unitCost: ['unit cost', 'unitcost', 'cost', 'hpp', 'harga pokok', 'cogs'],
  discount: ['discount', 'diskon', 'voucher seller', 'seller discount'],
  fee: ['fee', 'marketplace fee', 'biaya admin', 'biaya platform', 'platform fee'],
  feeRate: ['fee rate', 'feerate', 'fee %', 'admin rate', 'persentase fee'],
  adSpend: ['ad spend', 'adspend', 'ads', 'iklan', 'biaya iklan', 'ad cost'],
  shippingCost: ['shipping cost', 'shippingcost', 'shipping subsidy', 'subsidi ongkir', 'ongkir penjual'],
  status: ['status', 'order status', 'status pesanan']
};
const normalizeHeader = value => String(value).toLowerCase().replace(/[\uFEFF]/g, '').replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();

export function parseCsv(input) {
  const rows = [];
  const text = String(input).replace(/^\uFEFF/, '');
  let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (quoted) quoted = false;
      else if (cell === '') quoted = true;
      else throw new Error('Unexpected quote at character ' + (i + 1));
    } else if (ch === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some(value => value.trim() !== '')) rows.push(row);
      row = []; cell = '';
    } else {
      cell += ch;
    }
  }
  if (quoted) throw new Error('Unclosed quoted field');
  row.push(cell);
  if (row.some(value => value.trim() !== '')) rows.push(row);
  return rows;
}

export function importOrdersCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) return { orders: [], rejected: [], error: 'CSV is empty.' };
  const header = rows[0].map(normalizeHeader);
  const positions = {};
  for (const [field, aliases] of Object.entries(FIELDS)) {
    positions[field] = header.findIndex(h => aliases.some(alias => normalizeHeader(alias) === h));
  }
  const mandatory = ['id', 'date', 'product', 'quantity', 'unitPrice', 'unitCost'];
  const missing = mandatory.filter(field => positions[field] < 0);
  if (missing.length) return { orders: [], rejected: [], error: 'Missing columns: ' + missing.join(', ') };
  const orders = []; const rejected = [];
  rows.slice(1).forEach((row, i) => {
    const candidate = {};
    for (const [field, index] of Object.entries(positions)) {
      if (index >= 0) candidate[field] = row[index] ?? '';
    }
    const result = validateOrder(candidate);
    if (result.ok) orders.push(result.order);
    else rejected.push({ line: i + 2, reason: result.issues.join('; ') });
  });
  return { orders, rejected, error: null };
}

const EXPORT_COLUMNS = ['id','date','channel','product','sku','quantity','unitPrice','unitCost','discount','fee','feeRate','adSpend','shippingCost','status'];
function safeCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  // Spreadsheet cells are untrusted when an imported label is re-exported.
  if (/^[\s]*[=+@\-]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text.trim())) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function exportOrdersCsv(orders) {
  return [EXPORT_COLUMNS.join(','), ...orders.map(order => EXPORT_COLUMNS.map(name => safeCell(order[name])).join(','))].join('\r\n');
}
