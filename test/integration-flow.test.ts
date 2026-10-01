import { describe, expect, test } from "bun:test";
import { Superchat } from "../src/client";
import { computeSignature, verifyWebhookSignature, constructWebhookEvent } from "../src/signature";
import type { Payment } from "../src/types/payments";
import { jsonResponse } from "./fixtures";

describe("Developer Payment SDK integration flow", () => {
  const secretKey = "sk_test_1234567890abcdef1234567890abcdef";
  const webhookSecret = "whsec_abcdef1234567890abcdef1234567890";

  test("full payment creation, idempotency, and webhook lifecycle", async () => {
    let capturedMethod = "";
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = url.toString();
      capturedMethod = init?.method || "GET";
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      capturedBody = init?.body ? JSON.parse(init.body as string) : null;

      const mockPaymentData: Payment = {
        id: "pay_test_0192837465",
        developerId: "dev_ws_abc123",
        appId: null,
        merchantTransactionId: "pay_test_0192837465",
        amount: 1500,
        currency: "BDT",
        status: "pending",
        rawStatus: "created",
        environment: "test",
        description: "WooCommerce Order #1042",
        checkoutUrl: "https://api.superchatbd.com/checkout/pay_test_0192837465",
        checkout_url: "https://api.superchatbd.com/checkout/pay_test_0192837465",
        platformFeeAmount: 75,
        feePercentage: 5,
        platformFeeRate: 5,
        netAmount: 1425,
        customerName: "Rahim Chowdhury",
        customerEmail: "rahim@example.com",
        customerPhone: "01711223344",
        customer: {
          name: "Rahim Chowdhury",
          email: "rahim@example.com",
          phone: "01711223344",
        },
        paymentMethod: null,
        isSimulated: true,
        metadata: { orderId: 1042, source: "woocommerce" },
        success_url: "https://myshop.com/checkout/order-received/1042?key=wc_order_abc",
        cancel_url: "https://myshop.com/cart?cancelled=1",
        paid_at: null,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return jsonResponse(mockPaymentData, 201);
    }) as unknown as typeof fetch;

    const client = new Superchat({
      apiKey: secretKey,
      baseUrl: "https://api.superchatbd.com",
      fetch: mockFetch,
    });

    // 1. Create Payment
    const payment = await client.payments.create(
      {
        amount: 1500,
        currency: "BDT",
        description: "WooCommerce Order #1042",
        success_url: "https://myshop.com/checkout/order-received/1042?key=wc_order_abc",
        cancel_url: "https://myshop.com/cart?cancelled=1",
        customer: {
          name: "Rahim Chowdhury",
          email: "rahim@example.com",
          phone: "01711223344",
        },
        metadata: { orderId: 1042, source: "woocommerce" },
      },
      { idempotencyKey: "wc_order_1042_idemp" },
    );

    expect(capturedMethod).toBe("POST");
    expect(capturedUrl).toBe("https://api.superchatbd.com/api/v1/payments");
    expect(capturedHeaders["Authorization"]).toBe(`Bearer ${secretKey}`);
    expect(capturedHeaders["Idempotency-Key"]).toBe("wc_order_1042_idemp");
    expect(capturedBody.amount).toBe(1500);
    expect(capturedBody.currency).toBe("BDT");
    expect(capturedBody.customer.email).toBe("rahim@example.com");

    expect(payment.id).toBe("pay_test_0192837465");
    expect(payment.checkoutUrl).toBe("https://api.superchatbd.com/checkout/pay_test_0192837465");
    expect(payment.netAmount).toBe(1425);

    // 2. Simulate Webhook Dispatch & Verification
    const timestamp = Math.floor(Date.now() / 1000);
    const webhookPayload = JSON.stringify({
      id: "evt_test_123456",
      event: "payment.completed",
      created_at: new Date().toISOString(),
      data: {
        id: payment.id,
        developerId: payment.developerId,
        amount: payment.amount,
        currency: payment.currency,
        status: "completed",
        rawStatus: "paid",
        metadata: payment.metadata,
      },
    });

    const signature = computeSignature(webhookPayload, webhookSecret, timestamp);
    const signatureHeader = `t=${timestamp},v1=${signature}`;

    const isValid = verifyWebhookSignature({
      payload: webhookPayload,
      signatureHeader,
      secret: webhookSecret,
      toleranceInSeconds: 300,
    });
    expect(isValid).toBe(true);

    const event = constructWebhookEvent({
      payload: webhookPayload,
      signatureHeader,
      secret: webhookSecret,
    });

    expect(event.event).toBe("payment.completed");
    expect((event.data as any).id).toBe(payment.id);
    expect((event.data as any).status).toBe("completed");
    expect((event.data as any).metadata.orderId).toBe(1042);
  });
});
