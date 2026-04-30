# CrabLink Security Policy

## MVP security rules

- No silent ROC spending.
- No fake receipts.
- No private-key storage.
- No seed phrase handling.
- No token logging.
- No direct calls to `ron-ledger`, `svc-wallet`, `svc-storage`, `svc-index`, or `omnigate`.
- Public extension calls should go through `svc-gateway`.

## Reporting

For now, report security issues privately to the repository owner.
