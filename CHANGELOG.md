# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-09-27

### Added

- Added `PaymentRefund` interface and `refund` property to `Payment` for handling refund details and the `requiresManualSettlement` flag (e.g. for EPS / BDT transactions where local MFS gateways require manual settlement).

## [1.0.0] - 2026-09-20

### Added

- `Superchat` client with `payments`, `account`, `webhooks` and `checkout` resources.
- `payments.create()` / `retrieve()` / `list()` / `refund()` against the hosted checkout API.
- `account.retrieve()` / `balance()` / `apps()`.
- `webhooks.create()` / `list()` / `deliveries()` / `remove()` / `test()` for webhook subscription management.
- `verifyWebhookSignature()` and `constructWebhookEvent()` helpers (HMAC-SHA256, timing-safe, replay tolerance) available both as standalone exports and on `superchat.webhooks`.
- Automatic `Idempotency-Key` generation for `payments.create()`, plus support for caller-supplied keys.
- Automatic retries with exponential backoff for idempotent requests, `429` and `5xx` responses.
- Typed error hierarchy: `SuperchatError`, `SuperchatConfigError`, `SuperchatAPIError`, `SuperchatConnectionError`, `SuperchatSignatureError`.
- Dual ESM / CommonJS output with TypeScript declarations and source maps.

[1.0.0]: https://www.npmjs.com/package/@zalveriq/superchatbd-sdk/v/1.0.0
