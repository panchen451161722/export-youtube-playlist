import { StripeProvider, type StripeConfigs } from './stripe';

/** New checkouts use the current account; existing Stripe IDs remain on their owner. */
export class StripeAccountsProvider extends StripeProvider {
  private readonly legacy?: StripeProvider;

  constructor(current: StripeConfigs, legacy?: StripeConfigs) {
    super(current);
    if (legacy) {
      if (!legacy.signingSecret || !legacy.portalConfigurationId) {
        throw new Error('Legacy Stripe account configuration is incomplete');
      }
      if (
        /^(sk|rk)_live_/.test(current.secretKey) !==
        /^(sk|rk)_live_/.test(legacy.secretKey)
      ) {
        throw new Error('Stripe accounts must use the same environment');
      }
      this.legacy = new StripeProvider(legacy);
    }
  }

  /** Resolve ownership with GET before any write; never retry a write on another account. */
  private async existing<T>(
    kind: Parameters<StripeProvider['hasResource']>[0],
    id: string,
    current: () => Promise<T>,
    legacy: (provider: StripeProvider) => Promise<T>
  ): Promise<T> {
    if (!this.legacy || (await super.hasResource(kind, id))) return current();
    return legacy(this.legacy);
  }

  override getPaymentSession(
    params: Parameters<StripeProvider['getPaymentSession']>[0]
  ) {
    return this.existing(
      'checkout',
      params.sessionId,
      () => super.getPaymentSession(params),
      (p) => p.getPaymentSession(params)
    );
  }

  override getPaymentInvoice(
    params: Parameters<StripeProvider['getPaymentInvoice']>[0]
  ) {
    return this.existing(
      'invoice',
      params.invoiceId,
      () => super.getPaymentInvoice(params),
      (p) => p.getPaymentInvoice(params)
    );
  }

  override getPaymentBilling(
    params: Parameters<StripeProvider['getPaymentBilling']>[0]
  ) {
    return this.existing(
      'customer',
      params.customerId,
      () => super.getPaymentBilling(params),
      (p) => p.getPaymentBilling(params)
    );
  }

  override cancelSubscription(
    params: Parameters<StripeProvider['cancelSubscription']>[0]
  ) {
    return this.existing(
      'subscription',
      params.subscriptionId,
      () => super.cancelSubscription(params),
      (p) => p.cancelSubscription(params)
    );
  }

  override expireOpenCheckout(sessionId: string) {
    return this.existing(
      'checkout',
      sessionId,
      () => super.expireOpenCheckout(sessionId),
      (p) => p.expireOpenCheckout(sessionId)
    );
  }

  override rejectGuestTrial(subscriptionId: string, guestId: string) {
    return this.existing(
      'subscription',
      subscriptionId,
      () => super.rejectGuestTrial(subscriptionId, guestId),
      (p) => p.rejectGuestTrial(subscriptionId, guestId)
    );
  }

  override async getPaymentEvent({ req }: { req: Request }) {
    if (!this.legacy) return super.getPaymentEvent({ req });
    // Each verifier needs the untouched body. A signed event is processed solely
    // with the matching account's API key, including subscription/invoice lookups.
    const legacyRequest = req.clone();
    try {
      return await super.getPaymentEvent({ req });
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !('type' in error) ||
        error.type !== 'StripeSignatureVerificationError'
      )
        throw error;
      return this.legacy.getPaymentEvent({ req: legacyRequest });
    }
  }

  override async getSubscriptionAccess(email: string, userId: string) {
    const current = await super.getSubscriptionAccess(email, userId);
    if (!this.legacy) return current;
    const legacy = await this.legacy.getSubscriptionAccess(email, userId);
    return {
      hasHistory: current.hasHistory || legacy.hasHistory,
      hasCurrent: current.hasCurrent || legacy.hasCurrent,
    };
  }

  override async getGuestSubscriptionHistory(
    email: string,
    excludeId: string,
    approvedGuestIds: Set<string>
  ) {
    const current = await super.getGuestSubscriptionHistory(
      email,
      excludeId,
      approvedGuestIds
    );
    if (!this.legacy) return current;
    const legacy = await this.legacy.getGuestSubscriptionHistory(
      email,
      excludeId,
      approvedGuestIds
    );
    return {
      hasHistory: current.hasHistory || legacy.hasHistory,
      hasCurrent: current.hasCurrent || legacy.hasCurrent,
    };
  }
}
