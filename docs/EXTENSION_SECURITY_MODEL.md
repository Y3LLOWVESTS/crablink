# Extension Security Model

## Hard rules

- Never silently spend ROC.
- Never fake receipts.
- Never store seed phrases or private keys in the MVP.
- Never log bearer tokens.
- Never send auth tokens to non-gateway hosts.
- Never request broad host permissions unless a later batch explicitly requires it.

## MVP permissions

Start with:

- `storage`
- `activeTab`
- local gateway host permissions for `127.0.0.1` and `localhost`

## Token handling

The MVP may allow a dev bearer/cap token for local testing. That token must not be logged, copied into receipts, shown in full, or sent to non-gateway hosts.

## Paid action handling

Every paid action must require explicit user confirmation and must display the action, payer account, target, amount, route, and correlation ID before execution.
