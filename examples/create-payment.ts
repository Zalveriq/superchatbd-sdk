/**
 * Creates a hosted checkout session.
 *
 * Usage (from the `sdk/` folder):
 *   SUPERCHAT_API_KEY=sk_test_… bun run examples/create-payment.ts
 *
 * Applications importing the published package use `@zalveriq/superchatbd-sdk`; this
 * example imports the sources directly so it runs without a build step.
 */
import { Superchat } from "../src/index";

const superchat = new Superchat({ apiKey: process.env.SUPERCHAT_API_KEY });

const payment = await superchat.payments.create({
  amount: 750,
  currency: "BDT",
  description: "Pro Plan (monthly)",
  success_url: "https://example.com/orders/success",
  cancel_url: "https://example.com/cart",
  customer: { name: "Karim Rahman", email: "karim@example.com" },
  metadata: { orderId: "order_9921" },
});

console.log(`Payment ${payment.id} — ${payment.status} (${payment.currency} ${payment.amount})`);
console.log(`Redirect the customer to: ${payment.checkoutUrl}`);
console.log(`Net amount after fees: ${payment.netAmount} (${payment.feePercentage}% platform fee)`);
