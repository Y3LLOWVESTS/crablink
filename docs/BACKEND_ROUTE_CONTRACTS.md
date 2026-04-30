# Backend Route Contracts

CrabLink should call `svc-gateway` public routes only.

## Initial routes

```text
GET  /healthz
GET  /readyz
GET  /crab/resolve?url=...
GET  /b3/:hash.kind
POST /paid/o/prepare
POST /assets/image/prepare
POST /assets/image
POST /sites/prepare
POST /sites
GET  /sites/:name
```

## Boundary

CrabLink does not call `ron-ledger`, `svc-wallet`, `svc-storage`, `svc-index`, or `omnigate` directly.

## Header strategy

Useful headers for configured local/dev flows:

```text
Authorization: Bearer <token>
x-ron-passport: <passport_subject>
x-ron-wallet-account: <wallet_account>
x-correlation-id: <generated_id>
Idempotency-Key: <generated_id_for_mutations>
Content-Type: application/json
```
