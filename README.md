# MarketplaceOps

A local-first analytics workspace for small ecommerce sellers. Import transaction-level CSV files, check net profit after marketplace fees and advertising, compare channels and products, and test pricing scenarios.

**Project status:** Working MVP. Fictional sample transactions load on first visit. This is not an official Shopee or TikTok integration and is not an accounting or tax system.

## What works today

- CSV imports with English and Indonesian column aliases, quoted fields, row validation and duplicate detection
- Order-level financial calculations covering discount, HPP, seller fees, advertising and shipping subsidies
- Channel, product, and period reporting, including returns and cancellations
- Searchable orders, manual order entry, CSV exports and local browser persistence
- Break-even price and contribution margin simulator
- Automated tests for parsing, validation, calculations and export safety

## Run locally

Requires Node.js 20 or newer. No runtime dependencies or API keys.

1. Clone the repository.
2. Run: npm run dev
3. Open: http://localhost:4173
4. Run checks: npm run check
5. Run tests: npm test

All source files are standard browser JavaScript modules; no build step is necessary. GitHub Pages can serve the root folder if enabled.

## CSV format

Required columns:

    order_id,date,product,quantity,unitPrice,unitCost

Optional columns:

    channel,sku,discount,fee,feeRate,adSpend,shippingCost,status

Example:

    order_id,date,channel,product,sku,quantity,unitPrice,unitCost,discount,feeRate,adSpend,shippingCost,status
    ORD-001,2026-11-12,Shopee,Everyday Sandal,FL-01,2,150000,70000,10000,12.5,9000,5000,completed

Header names are case-insensitive. Indonesian aliases such as Nomor Pesanan, Tanggal, Nama Produk, Jumlah, Harga Jual, HPP and Biaya Iklan are supported. Dates use YYYY-MM-DD or DD/MM/YYYY. All amounts are IDR.

For the exact calculation assumptions and limitations, read docs/architecture.md.

## Data privacy

Imports are parsed in the browser and saved to localStorage. No data leaves the device through the application. Avoid importing personal customer details, secrets or production credentials. Export a copy before clearing browser storage.

## Next milestones

- User-configurable fee rules and richer channel import adapters
- Order-level settlement reconciliation and return adjustments
- Inventory and purchase-cost tracking with audit trail
- Optional sync and accounts once a secure backend is designed

This is an independent software project under active development.
