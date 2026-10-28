# @zalveriq/superchatbd-sdk

Official TypeScript / Node.js SDK for the [Superchat BD](https://superchatbd.com) Developer Platform:
hosted checkout payments, refunds, account data, webhook subscriptions and webhook signature
verification.

[![npm version](https://img.shields.io/npm/v/@zalveriq/superchatbd-sdk)](https://www.npmjs.com/package/@zalveriq/superchatbd-sdk)
[![license](https://img.shields.io/npm/l/@zalveriq/superchatbd-sdk)](./LICENSE)

- Typed requests and responses for the whole `/api/v1` surface
- ESM and CommonJS builds with `.d.ts` declarations and source maps
- HMAC-SHA256 webhook verification with a timing-safe comparison and a replay tolerance
- Automatic idempotency keys and retries with exponential backoff
- No runtime dependencies

Requires Node.js 18 or newer (global `fetch`), or Bun / Deno with Node compatibility. Verification
helpers use `node:crypto`.

## Install

```bash
npm install @zalveriq/superchatbd-sdk
# or
bun add @zalveriq/superchatbd-sdk
# or
pnpm add @zalveriq/superchatbd-sdk
```

## Quickstart

```ts
import { Superchat } from "@zalveriq/superchatbd-sdk";

const superchat = new Superchat({
  apiKey: process.env.SUPERCHAT_API_KEY, // sk_live_… or sk_test_…
});

// 1. Create a hosted checkout session and send the customer to `checkoutUrl`
const payment = await superchat.payments.create({
  amount: 750,
  currency: "BDT",
  success_url: "https://myshop.com/orders/success",
  cancel_url: "https://myshop.com/cart",
  customer: { name: "Karim Rahman", email: "karim@example.com" },
  metadata: { orderId: "order_9921" },
});

console.log(payment.id, payment.checkoutUrl);

// 2. Inspect it later, for example from your webhook handler
const stored = await superchat.payments.retrieve(payment.id);
console.log(stored.status, stored.netAmount);
```

## Configuration

```ts
new Superchat({
  apiKey: "sk_live_…",
  baseUrl: "https://api.superchatbd.com",
  timeoutMs: 30_000,
  maxRetries: 2,
});
```

| Option        | Type                      | Default                       | Description                                                                                             |
| ------------- | ------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `apiKey`      | `string`                  | `process.env.SUPERCHAT_API_KEY` | Secret API key. Required — construction throws `SuperchatConfigError` without it.                     |
| `baseUrl`     | `string`                  | `process.env.SUPERCHAT_BASE_URL` or `https://api.superchatbd.com` | API origin. Trailing slashes are stripped; must be an absolute http(s) URL.     |
| `timeoutMs`   | `number`                  | `30000`                       | Per-request timeout.                                                                                    |
| `maxRetries`  | `number`                  | `2`                           | Retry budget for retryable requests. `0` disables retries.                                              |
| `environment` | `'live' \| 'test'`        | derived from the key prefix   | Asserted against the key: passing `test` with an `sk_live_…` key throws.                                 |
| `fetch`       | `typeof fetch`            | `globalThis.fetch`            | Custom `fetch` implementation.                                                                          |

`superchat.environment` exposes the resolved environment (`undefined` when the key prefix is
unrecognised) and `superchat.baseUrl` the resolved origin.

## API reference

### `superchat.payments`

| Method                                     | HTTP                                | Returns               |
| ------------------------------------------ | ----------------------------------- | --------------------- |
| `create(params, options?)`                 | `POST /api/v1/payments`             | `Payment`             |
| `retrieve(paymentId)`                      | `GET /api/v1/payments/:id`          | `Payment`             |
| `list({ page?, limit?, status? })`         | `GET /api/v1/payments`              | `Paginated<Payment>`  |
| `refund(paymentId, { reason? }, options?)` | `POST /api/v1/payments/:id/refund`  | `Payment`             |

`create` params: `amount` (required), `success_url` (required), `cancel_url` (required),
`currency` (`"BDT"` \| `"USD"`, default `"BDT"`), `description`, `customer: { name?, email?, phone? }`,
`metadata`.

A `Payment` exposes `id`, `amount`, `currency`, `status`, `rawStatus`, `checkoutUrl`, `netAmount`,
`platformFeeAmount`, `feePercentage`, `customer`, `metadata`, `createdAt` and more. `status` is the
public status (`pending`, `completed`, `failed`, `cancelled`, `refunded`, `expired`); `rawStatus` is
the internal one (`created`, `processing`, `paid`, …). The API also returns legacy snake_case
aliases (`checkout_url`, `platform_fee`, `platform_fee_rate`, `net_amount`) which remain typed for
backwards compatibility.

Only payments in the internal `paid` status can be refunded. A refund debits your workspace
earnings balance and returns the payment with an attached `refund` object (`PaymentRefund`):
- `id`: Gateway refund identifier, or `null` for manual settlement.
- `requiresManualSettlement`: `true` when the payment was settled via EPS / Bangladeshi Mobile
  Financial Services (bKash/Nagad/Rocket), which do not support automated API reversals. In this case,
  the merchant must disburse funds to the customer manually outside the platform.
- `reason`: The refund reason string provided by the caller.

Test mode payments cannot be refunded because no real money was collected.

### `superchat.account`

| Method       | HTTP                          | Returns                   |
| ------------ | ----------------------------- | ------------------------- |
| `retrieve()` | `GET /api/v1/account`         | `AccountDetails`          |
| `balance()`  | `GET /api/v1/account/balance` | `AccountBalanceResponse`  |
| `apps()`     | `GET /api/v1/account/apps`    | `DeveloperApp[]`          |

`retrieve()` returns `{ workspace, balance: { bdt, usd }, volume: { bdt, usd, total_payments } }`.

### `superchat.webhooks`

| Method                                  | HTTP                                       | Returns                             |
| --------------------------------------- | ------------------------------------------ | ----------------------------------- |
| `create({ url, events, appId? })`       | `POST /api/v1/webhooks`                    | `WebhookEndpoint` (includes `secret`) |
| `list()`                                | `GET /api/v1/webhooks`                     | `WebhookEndpoint[]`                 |
| `deliveries({ webhookId?, page?, limit? })` | `GET /api/v1/webhooks/deliveries`      | `Paginated<WebhookDelivery>`        |
| `remove(webhookId)`                     | `DELETE /api/v1/webhooks/:id`              | `{ success, message }`              |
| `test(webhookId)`                       | `POST /api/v1/webhooks/:id/test`           | `WebhookDelivery \| null`           |

`test()` sends a `test.ping` event and returns the logged delivery; the API returns `null` when the
delivery could not be logged.

### `superchat.checkout`

Hosted checkout page endpoints. They need no API key, but are exposed for server-driven flows.

| Method                                       | HTTP                                   | Returns                     |
| -------------------------------------------- | -------------------------------------- | --------------------------- |
| `retrieve(sessionId)`                        | `GET /api/v1/checkout/:id`             | `CheckoutSession`           |
| `simulate(sessionId, { status? \| action? })` | `POST /api/v1/checkout/:id/simulate`  | `CheckoutSimulationResult`  |
| `pay(sessionId, { paymentMethod?, phoneNumber?, redirectUrl? })` | `POST /api/v1/checkout/:id/pay` | `CheckoutPayResult` |
| `createDemoSession({ amount?, currency?, … })` | `POST /api/v1/checkout/demo-session`  | `DemoCheckoutSession`       |

`simulate()` only works on test sessions. `pay()` returns `{ redirectUrl }` for live sessions, but
test sessions are routed through the simulator and return `{ status, redirectUrl, success }` instead
— check for the `success` property to tell them apart.

## Errors

| Class                    | When                                                                  |
| ------------------------ | --------------------------------------------------------------------- |
| `SuperchatError`         | Base class of everything below (also thrown with `invalid_response` / `invalid_payload`). |
| `SuperchatConfigError`   | Invalid or missing client options.                                     |
| `SuperchatAPIError`      | Any non-2xx response — carries `statusCode`, `body` and `requestId`.    |
| `SuperchatConnectionError` | Network failure, timeout or abort — `code` is `network_error`, `timeout` or `aborted`. |
| `SuperchatSignatureError` | Webhook verification failed — see the webhook section.                  |

```ts
import { SuperchatAPIError, SuperchatError } from "@zalveriq/superchatbd-sdk";

try {
  await superchat.payments.create({ amount: 10, success_url: "…", cancel_url: "…" });
} catch (error) {
  if (error instanceof SuperchatAPIError) {
    console.error(error.statusCode, error.message, error.body);
  } else if (error instanceof SuperchatError) {
    console.error(error.code, error.message);
  }
}
```

Validation errors from the API arrive as an array of messages and are joined into a single readable
message.

## Webhooks

Subscribe to `payment.created`, `payment.completed`, `payment.refunded` (or `*`). Every request
carries:

| Header                 | Description                                                              |
| ---------------------- | ------------------------------------------------------------------------ |
| `X-Superchat-Signature` | `t=<unix-seconds>,v1=<hex>`; the HMAC-SHA256 of `<t>.<raw body>`.        |
| `X-Superchat-Event`     | Event name.                                                              |
| `X-Superchat-Delivery`  | Delivery ID.                                                             |

The body is an envelope: `{ id: "evt_…", event, created_at, data }`.

```ts
import { constructWebhookEvent, SuperchatSignatureError } from "@zalveriq/superchatbd-sdk";

// Express: keep the raw body!
app.post("/webhooks/superchat", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const event = constructWebhookEvent({
      payload: req.body,
      signatureHeader: req.headers["x-superchat-signature"] as string,
      secret: process.env.SUPERCHAT_WEBHOOK_SECRET!,
    });

    if (event.event === "payment.completed") {
      // fulfill the order referenced by event.data.metadata.orderId
    }

    res.sendStatus(200);
  } catch (error) {
    if (error instanceof SuperchatSignatureError) {
      // error.code: malformed_header | timestamp_outside_tolerance | signature_mismatch
      return res.sendStatus(400);
    }
    throw error;
  }
});
```

Use `verifyWebhookSignature()` instead when you only need a boolean — it never throws for untrusted
input and is a good fit for middleware:

```ts
if (!verifyWebhookSignature({ payload: rawBody, signatureHeader, secret })) {
  return new Response("invalid signature", { status: 400 });
}
```

Both helpers accept the raw body as a `string`, `Buffer` or `Uint8Array`, and a
`toleranceInSeconds` option (default `300`; `0` disables the replay check). `computeSignature()`
exposes the same HMAC calculation for tests and tooling.

**Payload shapes to be aware of.** For `payment.created`, `payment.completed` and `payment.refunded`,
`data` is the payment object (`payment.refunded` adds `refund_reason`). Two cases differ, and the
SDK does not rewrite them:

- `test.ping` events send `data: { event: "test.ping", timestamp, developer_id, message }` —
  see `TestPingPayload`.
- Sandbox sessions created from the dashboard simulator send `payment.created` with `data` wrapped
  as `{ event, payment }`.

## Idempotency and retries

`payments.create()` sends an `Idempotency-Key` automatically (a UUID per call), so a retried request
can never create a second charge. Pass your own key to deduplicate across processes:

```ts
await superchat.payments.create(params, { idempotencyKey: `order_${order.id}` });
```

The API caches the first response for 24 hours and replays it with `Idempotent-Replayed: true`.
`payments.refund()` accepts the same option — without a key it is not retried.

Retries (default `maxRetries: 2`) apply to `GET` requests and to requests carrying an idempotency
key. Network failures, timeouts, `408`, `429` and `5xx` responses are retried with exponential
backoff and jitter, honouring `Retry-After`.

## Test mode

Keys prefixed with `sk_test_` run against the sandbox: payments behave like live payments but can be
settled instantly with `checkout.simulate()`, and no real money moves. The API also accepts the
public demo key `sk_test_demo` for trying endpoints from the Swagger UI. Redirect URLs for live
payments must use HTTPS.

## Examples

Runnable scripts live in [`examples/`](./examples):

```bash
SUPERCHAT_API_KEY=sk_test_… bun run examples/create-payment.ts
SUPERCHAT_API_KEY=sk_test_… bun run examples/list-and-refund.ts pay_123
SUPERCHAT_WEBHOOK_SECRET=whsec_… bun run examples/webhook-receiver.ts
```

## Development

```bash
bun install
bun run build        # ESM + CJS + declarations + source maps into dist/
bun test
bun run typecheck
```

## Links

- Developer documentation: <https://superchatbd.com/docs/sdk>
- OpenAPI specification: <https://api.superchatbd.com/openapi.json>
- GitHub repository: <https://github.com/Zalveriq/superchatbd-sdk>

## License

[MIT](./LICENSE) © Superchat BD
