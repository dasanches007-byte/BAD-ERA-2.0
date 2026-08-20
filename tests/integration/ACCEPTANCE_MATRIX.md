# v0.2 critical integration acceptance matrix

1. Two concurrent reservation attempts for the last unit: exactly one succeeds when continue-selling is OFF.
2. Repeating reserve_checkout_inventory for the same checkout is a no-op, not a second reservation.
3. checkout.session.expired releases committed stock exactly once.
4. checkout.session.completed with unpaid delayed method moves reservations to payment_pending instead of releasing them.
5. async_payment_succeeded converts payment_pending reservation to one paid order and decrements on-hand exactly once.
6. async_payment_failed releases payment_pending reservation.
7. Duplicate or concurrent checkout.session.completed events return the same order and cannot duplicate order items/inventory movements.
8. Bundle S/Blue payment decrements Tee/S and Crossbody/Blue, never a bundle stock row.
9. Manual Supplier product creates a paid BAD ERA order plus a durable supplier_tasks row without an internal inventory_level decrement.
10. Mixed cart creates one order and independent fulfillment groups for BAD ERA Stock and Manual Supplier.
11. Authenticated normal customer cannot read variant_financials, supplier_tasks, fulfillment provider credentials/settings or another customer's orders.
12. Active Studio owner can perform Studio reads/writes; inactive/non-owner Studio user cannot.
13. Anonymous Data API role cannot select public tables.
14. Stripe signature verification fails if the request body is changed before constructEvent.
15. Published page revisions remain immutable after all v0.2 security migrations.
