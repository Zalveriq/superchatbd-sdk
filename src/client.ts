import { resolveConfig, type ResolvedConfig } from "./config";
import type { ClientContext } from "./http";
import { AccountResource } from "./resources/account";
import { CheckoutResource } from "./resources/checkout";
import { PaymentsResource } from "./resources/payments";
import { WebhooksResource } from "./resources/webhooks";
import type { Environment, SuperchatOptions } from "./types";

/**
 * Client for the Superchat BD Developer Platform.
 *
 * ```ts
 * import { Superchat } from "@zalveriq/superchatbd-sdk";
 *
 * const superchat = new Superchat({ apiKey: process.env.SUPERCHAT_API_KEY });
 * ```
 */
export class Superchat {
  /** Hosted checkout payments. */
  readonly payments: PaymentsResource;
  /** Workspace, balance and applications. */
  readonly account: AccountResource;
  /** Webhook subscriptions and signature verification. */
  readonly webhooks: WebhooksResource;
  /** Hosted checkout page endpoints. */
  readonly checkout: CheckoutResource;
  /**
   * Environment derived from the API key prefix, or the value passed explicitly
   * to the constructor. `undefined` when the key prefix is unrecognised.
   */
  readonly environment: Environment | undefined;

  private readonly config: ResolvedConfig;

  constructor(options: SuperchatOptions = {}) {
    this.config = resolveConfig(options);
    this.environment = this.config.environment;

    const context: ClientContext = {
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      timeoutMs: this.config.timeoutMs,
      maxRetries: this.config.maxRetries,
      fetch: this.config.fetch,
    };

    this.payments = new PaymentsResource(context);
    this.account = new AccountResource(context);
    this.webhooks = new WebhooksResource(context);
    this.checkout = new CheckoutResource(context);
  }

  /** Resolved API origin used for every request. */
  get baseUrl(): string {
    return this.config.baseUrl;
  }
}
