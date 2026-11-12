import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, importOrdersCsv, exportOrdersCsv } from '../src/lib/csv.js';

test('reads quoted commas, embedded line breaks and UTF-8 BOM', () => {
  const rows = parseCsv('\uFEFFid,product,qty\r\n1,"Mule, leather",2\r\n2,"Line\nTwo",1');
  assert.deepEqual(rows, [['id','product','qty'],['1','Mule, leather','2'],['2','Line\nTwo','1']]);
});

test('rejects unterminated quoted fields', () => {
  assert.throws(() => parseCsv('id,product\n1,"bad'), /Unclosed quoted/);
});

test('imports Indonesian column names and isolates invalid rows', () => {
  const csv = [
    'Nomor Pesanan,Tanggal,Nama Produk,Jumlah,Harga Jual,HPP,Platform,Biaya Iklan',
    'ABC,12/11/2026,Sandal,2,150.000,70.000,Shopee,10.000',
    'DEF,31/11/2026,Sandal,1,100000,60000,TikTok,0'
  ].join('\n');
  const result = importOrdersCsv(csv);
  assert.equal(result.error, null);
  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].unitPrice, 150000);
  assert.equal(result.orders[0].channel, 'Shopee');
  assert.equal(result.rejected[0].line, 3);
});

test('round trips exported order records through the importer', () => {
  const imported = importOrdersCsv('order_id,date,product,qty,unitprice,unitcost,channel\nA1,2026-11-12,"Mule, black",1,150000,90000,Shopee');
  assert.equal(imported.error, null);
  const again = importOrdersCsv(exportOrdersCsv(imported.orders));
  assert.equal(again.error, null);
  assert.deepEqual(again.orders, imported.orders);
});

test('escapes formula-like values when exporting to spreadsheets', () => {
  const parsed = importOrdersCsv('order_id,date,product,qty,price,cost\nX,2026-11-12,"=1+1",1,100000,50000');
  assert.ok(exportOrdersCsv(parsed.orders).includes("'=1+1"));
});
