import { validateOrder } from './orders.js';

// Fictional example transactions. Safe to inspect, export and replace.
const items = [
  ['Falado Wedge Sandal', 'FL-WDG-01', 239900, 110000],
  ['Vilena Flat Mule', 'VL-FLT-02', 119900, 63000],
  ['Falado Platform', 'FL-PLT-03', 259900, 118000],
  ['Vilena Everyday Slides', 'VL-SLD-04', 99900, 52000],
  ['Falado Soft Heel', 'FL-HL-05', 219900, 104000]
];

const records = [
  [1,'2026-11-01','Shopee',0,2,'completed',13000,45000],
  [2,'2026-11-01','TikTok',1,3,'completed',0,29000],
  [3,'2026-11-02','Shopee',2,1,'completed',12000,21000],
  [4,'2026-11-02','TikTok',3,4,'completed',10000,32000],
  [5,'2026-11-03','Shopee',0,1,'returned',0,9000],
  [6,'2026-11-03','Shopee',4,2,'completed',10000,39000],
  [7,'2026-11-04','TikTok',2,2,'completed',5000,45000],
  [8,'2026-11-04','Shopee',1,3,'completed',10000,28000],
  [9,'2026-11-05','TikTok',3,2,'cancelled',0,4000],
  [10,'2026-11-05','Shopee',2,2,'completed',25000,46000],
  [11,'2026-11-06','TikTok',4,2,'completed',12000,35000],
  [12,'2026-11-06','Shopee',0,3,'completed',25000,62000],
  [13,'2026-11-07','TikTok',1,5,'completed',10000,54000],
  [14,'2026-11-07','Shopee',2,1,'completed',0,19000],
  [15,'2026-11-08','Shopee',3,3,'completed',0,33000],
  [16,'2026-11-08','TikTok',4,1,'returned',0,8000],
  [17,'2026-11-09','Shopee',0,2,'completed',13000,45000],
  [18,'2026-11-09','TikTok',1,2,'completed',7000,22000],
  [19,'2026-11-10','Shopee',2,2,'completed',12000,49000],
  [20,'2026-11-10','TikTok',3,4,'completed',8000,29000],
  [21,'2026-11-11','Shopee',4,1,'completed',5000,19000],
  [22,'2026-11-11','TikTok',0,2,'completed',12000,41000],
  [23,'2026-10-28','Shopee',1,3,'completed',8000,22000],
  [24,'2026-10-29','TikTok',2,1,'completed',0,18000],
  [25,'2026-10-30','Shopee',3,4,'completed',8000,27000],
  [26,'2026-10-31','TikTok',4,2,'completed',15000,38000]
];

export const sampleOrders = records.map(([id,date,channel,index,quantity,status,discount,adSpend]) => {
  const [product, sku, unitPrice, unitCost] = items[index];
  const result = validateOrder({ id: 'DEMO-' + String(id).padStart(3, '0'),
    date, channel, product, sku, quantity, unitPrice, unitCost,
    discount, feeRate: channel === 'Shopee' ? 13.5 : 11.8,
    adSpend, shippingCost: status === 'completed' ? 5000 : 1500, status });
  if (!result.ok) throw new Error('Invalid sample order ' + id);
  return result.order;
});
