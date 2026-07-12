import Stripe from "stripe";
import type { Env } from "../env";

export interface CheckoutSessionRequest {
  caseId: string;
  customerEmail: string;
  depositCents: number;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export interface RefundPaymentIntentRequest {
  caseId: string;
  paymentIntentId: string;
  reason: string;
}

export interface StripeAdapter {
  createDepositCheckout(
    request: CheckoutSessionRequest,
  ): Promise<{ checkoutUrl: string }>;
  constructEvent(
    raw: string,
    signature: string,
    webhookSecret: string,
  ): Promise<unknown>;
  refundPaymentIntent(request: RefundPaymentIntentRequest): Promise<void>;
}

export interface StripeClientBoundary {
  checkout: {
    sessions: {
      create(params: Record<string, unknown>): Promise<{ url: string | null }>;
    };
  };
  refunds: {
    create(params: Record<string, unknown>): Promise<unknown>;
  };
  webhooks: {
    constructEventAsync(
      raw: string,
      signature: string,
      webhookSecret: string,
      tolerance?: number,
      cryptoProvider?: unknown,
    ): Promise<unknown>;
  };
}

interface StripeClientWithCryptoProvider {
  client: StripeClientBoundary;
  cryptoProvider: unknown;
}

export const createStripeClient = (
  secretKey: string,
): StripeClientWithCryptoProvider => ({
  client: new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  }) as unknown as StripeClientBoundary,
  cryptoProvider: Stripe.createSubtleCryptoProvider(),
});

export const createStripeAdapter = (
  env: Pick<Env, "STRIPE_SECRET_KEY">,
  clientOrBundle: StripeClientBoundary | StripeClientWithCryptoProvider =
    createStripeClient(env.STRIPE_SECRET_KEY),
): StripeAdapter => ({
  async createDepositCheckout(request) {
    const client = stripeClientFrom(clientOrBundle);
    const session = await client.checkout.sessions.create({
      mode: "payment",
      customer_email: request.customerEmail,
      success_url: request.successUrl,
      cancel_url: request.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      consent_collection: { terms_of_service: "required" },
      metadata: request.metadata,
      payment_intent_data: { metadata: request.metadata },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: request.depositCents,
            product_data: {
              name: "Priority Discovery Deposit",
              description:
                "Fixed deposit for a Priority Discovery operational blueprint.",
            },
          },
        },
      ],
    });

    if (!session.url) {
      throw new Error("Stripe Checkout Session did not include a URL");
    }

    return { checkoutUrl: session.url };
  },

  constructEvent: (raw, signature, webhookSecret) => {
    const client = stripeClientFrom(clientOrBundle);
    const cryptoProvider = cryptoProviderFrom(clientOrBundle);
    return client.webhooks.constructEventAsync(
      raw,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  },

  async refundPaymentIntent(request) {
    const client = stripeClientFrom(clientOrBundle);
    await client.refunds.create({
      payment_intent: request.paymentIntentId,
      reason: "requested_by_customer",
      metadata: {
        case_id: request.caseId,
        refund_reason: request.reason,
      },
    });
  },
});

const stripeClientFrom = (
  value: StripeClientBoundary | StripeClientWithCryptoProvider,
): StripeClientBoundary => ("client" in value ? value.client : value);

const cryptoProviderFrom = (
  value: StripeClientBoundary | StripeClientWithCryptoProvider,
): unknown => ("cryptoProvider" in value ? value.cryptoProvider : undefined);
