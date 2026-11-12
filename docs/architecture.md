# Technical notes

## Motivation

Marketplace sellers often see gross revenue but cannot easily reconcile it with item cost, selling fees, ad spend and seller-funded shipping. MarketplaceOps focuses on a transparent, editable order-level calculation before expanding into settlement reconciliation.

## Modules

- src/lib/orders.js validates and normalizes order records. This is also where IDs and status strings are standardized.
- src/lib/csv.js parses CSV files, maps headers, flags invalid rows and prepares safe exports.
- src/lib/analytics.js is pure domain logic: profit by order, aggregations, filters, daily trends, and break-even analysis.
- src/lib/storage.js persists normalized orders in browser storage.
- src/lib/sample.js provides fictional example data.
- src/main.js renders the dashboard and coordinates input events.

Node's built-in test runner exercises the domain independently from the UI.

## Accounting assumptions

For completed orders:

    net revenue = quantity * unit price - seller discount
    platform fee = explicit fee if supplied; otherwise net revenue * fee rate
    COGS = quantity * unit cost
    profit = net revenue - platform fee - COGS - attributed ad spend - seller shipping cost

For returned/cancelled orders, revenue, seller discount, platform fee and COGS are set to zero. Ads and shipping remain as expenses when reported. This is a **simplified model**; actual returns may include partial refunds, reverse logistics, non-refundable fees, tax and settlement timing. Do not substitute these estimates for reconciled marketplace statements.

Margin is total profit divided by total net revenue. ROAS is net revenue divided by attributed ad spend; ROAS is not available when ads are zero.

## Data design

Each row uses an order ID scoped to a channel. Duplicate IDs in the same channel are skipped. A row models one sold line item. For orders with multiple SKUs, use a distinct line identifier as order ID (e.g. ORD-123-L1), or adapt the importer before using transaction-level marketplace exports.

Header aliases intentionally cover common normalized exports, not all native marketplace reports. Raw platform exports may need column mapping and may represent gross payment differently; check the resulting values before trusting totals.

## Security and future scale

The current MVP has no authentication, cloud API or payment integration. Browser storage is convenient for prototypes, but not a multi-device, audited database. No API keys belong in the frontend.

Next steps:
1. Implement per-channel import adapters and review screens for mismatched columns.
2. Add settlement records with refunds, fee reversals, discounts borne by the platform and payout timing.
3. Add editable fee configurations and per-order cost attribution.
4. Integrate optional user accounts and server-side data with row-level access controls.
5. Add end-to-end tests and accessibility audits.

We prefer correct, documented calculations over opaque totals.
