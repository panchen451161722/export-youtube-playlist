import Stripe from 'stripe';

import { sameCheckoutReturnUrls } from '@/lib/payment-return-url';

import {
  CheckoutSession,
  PaymentBilling,
  PaymentEventType,
  PaymentInterval,
  PaymentInvoice,
  PaymentStatus,
  PaymentType,
  SubscriptionCycleType,
  SubscriptionInfo,
  SubscriptionStatus,
  type PaymentConfigs,
  type PaymentEvent,
  type PaymentOrder,
  type PaymentProvider,
  type PaymentSession,
} from './types';

/**
 * Stripe payment provider configs
 * @docs https://stripe.com/docs
 */
export interface StripeConfigs extends PaymentConfigs {
  secretKey: string;
  publishableKey: string;
  signingSecret?: string;
  portalConfigurationId?: string;
  allowedPaymentMethods?: string[];
  allowPromotionCodes?: boolean;
}

/**
 * Stripe payment provider implementation
 * @website https://stripe.com/
 */
export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  configs: StripeConfigs;

  private client: Stripe;

  constructor(configs: StripeConfigs) {
    this.configs = configs;
    this.client = new Stripe(configs.secretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });
  }

  async getSubscriptionAccess(email: string, userId: string) {
    const customers = await this.client.customers.list({ email, limit: 100 });
    let hasHistory = false;
    let hasCurrent = false;
    for (const customer of customers.data.filter(
      (c) =>
        c.metadata.app === 'export-youtube-playlist' &&
        c.metadata.user_id === userId
    )) {
      const subscriptions = await this.client.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 100,
      });
      hasHistory ||= subscriptions.data.length > 0;
      hasCurrent ||= subscriptions.data.some(
        (s) => !['canceled', 'incomplete_expired'].includes(s.status)
      );
    }
    return { hasHistory, hasCurrent };
  }

  async expireOpenCheckout(sessionId: string) {
    const session = await this.client.checkout.sessions.retrieve(sessionId);
    if (session.status === 'open')
      await this.client.checkout.sessions.expire(sessionId);
    return session.status === 'complete' ? 'complete' : 'expired';
  }

  /** Billing email is used for eligibility only, never for account authentication. */
  async getGuestSubscriptionHistory(
    email: string,
    excludeId: string,
    approvedGuestIds: Set<string>
  ) {
    let hasHistory = false;
    let hasCurrent = false;
    for await (const customer of this.client.customers.list({
      email,
      limit: 100,
    })) {
      for await (const sub of this.client.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 100,
      })) {
        if (
          sub.id === excludeId ||
          sub.metadata.app !== 'export-youtube-playlist' ||
          !/^guard_(lite|pro|ultra)_yearly$/.test(sub.metadata.product_id || '')
        )
          continue;
        // Concurrent new guest trials are serialized by the database email reservation.
        if (
          sub.metadata.guest_trial_policy === 'email_v1' &&
          ['trialing', 'canceled'].includes(sub.status) &&
          !approvedGuestIds.has(sub.id)
        )
          continue;
        if (
          sub.status === 'incomplete_expired' ||
          (sub.status === 'incomplete' && !sub.trial_start)
        )
          continue;
        hasHistory = true;
        hasCurrent ||= !['canceled', 'incomplete_expired'].includes(sub.status);
      }
    }
    return { hasHistory, hasCurrent };
  }

  /** Only cancel the newly created guest trial, never a prior customer's subscription. */
  async rejectGuestTrial(subscriptionId: string, guestId: string) {
    let sub = await this.client.subscriptions.retrieve(subscriptionId);
    if (
      sub.metadata.app !== 'export-youtube-playlist' ||
      sub.metadata.guest_checkout_id !== guestId ||
      sub.metadata.checkout_flow !== 'guest_backup' ||
      !sub.trial_start
    )
      throw new Error('Guest trial ownership mismatch');
    if (sub.status !== 'canceled') {
      sub = await this.client.subscriptions.cancel(subscriptionId, {
        invoice_now: false,
        prorate: false,
      });
    }
    if (sub.status !== 'canceled')
      throw new Error('Guest trial cancellation not confirmed');
    return this.buildPaymentSessionFromSubscription(sub);
  }

  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    try {
      // check payment price
      if (!order.price) {
        throw new Error('price is required');
      }

      // create payment with dynamic product

      // build price data
      const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData =
        {
          currency: order.price.currency,
          unit_amount: order.price.amount, // unit: cents
          product_data: {
            name: order.description || '',
          },
        };

      if (order.type === PaymentType.SUBSCRIPTION) {
        // create subscription payment

        // check payment plan
        if (!order.plan) {
          throw new Error('plan is required');
        }

        // build recurring data
        priceData.recurring = {
          interval_count: order.plan.intervalCount || 1,
          interval: order.plan
            .interval as Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval,
        };
      } else {
        // create one-time payment
      }

      let lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
        price_data: priceData,
        quantity: 1,
      };
      if (order.priceId) {
        const registered = await this.client.prices.retrieve(order.priceId);
        const live = /^(sk|rk)_live_/.test(this.configs.secretKey);
        if (
          !registered.active ||
          registered.livemode !== live ||
          registered.currency !== order.price.currency.toLowerCase() ||
          registered.unit_amount !== order.price.amount ||
          registered.recurring?.interval !== order.plan?.interval ||
          registered.recurring?.interval_count !==
            (order.plan?.intervalCount || 1)
        ) {
          throw new Error('Stripe price does not match the server catalog');
        }
        lineItem = { price: registered.id, quantity: 1 };
      }

      // set or create customer
      let customerId = '';
      if (order.customer?.email) {
        const customers = await this.client.customers.list({
          email: order.customer.email,
          limit: 100,
        });
        const existing =
          order.metadata?.user_id &&
          customers.data.find(
            (customer) =>
              customer.metadata.app === order.metadata?.app &&
              customer.metadata.user_id === order.metadata?.user_id
          );
        if (existing) {
          customerId = existing.id;
        } else {
          const customer = await this.client.customers.create(
            {
              email: order.customer.email,
              name: order.customer.name,
              metadata: {
                ...order.customer.metadata,
                app: order.metadata?.app || '',
                user_id: order.metadata?.user_id || '',
              },
            },
            order.metadata?.user_id
              ? {
                  idempotencyKey: `guard-customer-${order.metadata.user_id}`,
                }
              : undefined
          );
          customerId = customer.id;
        }
      }

      // One open Checkout per account. Reuse retries and expire an abandoned
      // selection before changing plans. Stripe also serializes concurrent
      // creations with the same generation key (including different plans).
      // A guest has no customer yet. Its server-created purchase ID survives request retries.
      let checkoutGeneration: string | undefined =
        order.metadata?.checkout_flow === 'guest_backup' &&
        order.metadata?.guest_checkout_id
          ? `guest-${order.metadata.guest_checkout_id}`
          : undefined;
      if (customerId && order.metadata?.app === 'export-youtube-playlist') {
        const subscriptions = await this.client.subscriptions.list({
          customer: customerId,
          status: 'all',
          limit: 100,
        });
        if (
          subscriptions.data.some(
            (s) => !['canceled', 'incomplete_expired'].includes(s.status)
          )
        ) {
          throw new Error(
            'An existing subscription must be managed from Billing.'
          );
        }
        if (order.plan?.trialPeriodDays && subscriptions.data.length) {
          throw new Error(
            'This account has already subscribed. Refresh pricing to subscribe without another trial.'
          );
        }
        const sessions = await this.client.checkout.sessions.list({
          customer: customerId,
          limit: 100,
        });
        const open = sessions.data.find(
          (s) => s.status === 'open' && s.metadata?.app === order.metadata?.app
        );
        if (
          open &&
          open.metadata?.product_id === order.metadata.product_id &&
          open.metadata?.trial_days ===
            String(order.plan?.trialPeriodDays || 0) &&
          (open.metadata?.checkout_flow || 'pricing') ===
            (order.metadata.checkout_flow || 'pricing') &&
          (open.metadata?.checkout_locale || 'en') ===
            (order.metadata.checkout_locale || 'en') &&
          sameCheckoutReturnUrls(open, order) &&
          open.url
        ) {
          return {
            provider: this.name,
            checkoutParams: {},
            checkoutResult: open,
            checkoutInfo: { sessionId: open.id, checkoutUrl: open.url },
            metadata: open.metadata,
          };
        }
        if (open) await this.client.checkout.sessions.expire(open.id);
        checkoutGeneration = `${customerId}-${sessions.data[0]?.id || 'first'}`;
      }

      // create payment session params
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode:
          order.type === PaymentType.SUBSCRIPTION ? 'subscription' : 'payment',
        line_items: [lineItem],
        ...(order.expiresAt
          ? { expires_at: Math.floor(order.expiresAt.getTime() / 1000) }
          : {}),
      };

      if (order.type === PaymentType.SUBSCRIPTION) {
        sessionParams.payment_method_types = ['card'];
        sessionParams.subscription_data = { metadata: order.metadata };
        sessionParams.payment_method_collection = 'always';
        if (order.plan?.trialPeriodDays) {
          sessionParams.subscription_data.trial_period_days =
            order.plan.trialPeriodDays;
          sessionParams.subscription_data.trial_settings = {
            end_behavior: { missing_payment_method: 'cancel' },
          };
        }
      }

      // pre-set promotion code
      if (order.discount && order.discount.code) {
        sessionParams.discounts = [
          {
            promotion_code: order.discount.code,
          },
        ];
      }

      // allow user input promotion code
      if (this.configs.allowPromotionCodes && !sessionParams.discounts) {
        sessionParams.allow_promotion_codes = true;
      }

      // If currency is CNY, enable WeChat Pay and Alipay (only for one-time payments)
      // Note: WeChat Pay and Alipay through Stripe only supports one-time payments, not subscriptions
      const currency = order.price.currency.toLowerCase();
      if (currency === 'cny' && order.type === PaymentType.ONE_TIME) {
        // Enable WeChat Pay and Alipay for CNY one-time payments
        sessionParams.payment_method_types = [];
        sessionParams.payment_method_options = {};

        // get allowed payment methods
        const allowedPaymentMethods = this.configs.allowedPaymentMethods || [];

        if (allowedPaymentMethods.includes('card')) {
          sessionParams.payment_method_types.push('card');
        }
        if (allowedPaymentMethods.includes('wechat_pay')) {
          sessionParams.payment_method_types.push('wechat_pay');
          sessionParams.payment_method_options.wechat_pay = {
            client: 'web',
          };
        }
        if (allowedPaymentMethods.includes('alipay')) {
          sessionParams.payment_method_types.push('alipay');
          sessionParams.payment_method_options.alipay = {};
        }

        if (allowedPaymentMethods.length === 0) {
          // not set allowed payment methods, use default payment methods
          sessionParams.payment_method_types = ['card'];
        }
      }

      if (order.type === PaymentType.ONE_TIME) {
        sessionParams.invoice_creation = {
          enabled: true,
        };
      }

      if (customerId) {
        sessionParams.customer = customerId;
      }

      if (order.metadata) {
        sessionParams.metadata = order.metadata;
      }

      if (order.successUrl) {
        sessionParams.success_url = order.successUrl;
      }

      if (order.cancelUrl) {
        sessionParams.cancel_url = order.cancelUrl;
      }

      const session = await this.client.checkout.sessions.create(
        sessionParams,
        checkoutGeneration
          ? { idempotencyKey: `guard-checkout-${checkoutGeneration}` }
          : undefined
      );
      if (!session.id || !session.url) {
        throw new Error('create payment failed');
      }

      return {
        provider: this.name,
        checkoutParams: sessionParams,
        checkoutInfo: {
          sessionId: session.id,
          checkoutUrl: session.url,
        },
        checkoutResult: session,
        metadata: order.metadata || {},
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment session by session id
   */
  async getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession> {
    try {
      if (!sessionId) {
        throw new Error('sessionId is required');
      }

      const session = await this.client.checkout.sessions.retrieve(sessionId);

      return await this.buildPaymentSessionFromCheckoutSession(session);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment event from webhook notification
   */
  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    try {
      const rawBody = await req.text();
      const signature = req.headers.get('stripe-signature') as string;

      if (!rawBody || !signature) {
        throw new Error('Invalid webhook request');
      }

      if (!this.configs.signingSecret) {
        throw new Error('Signing Secret not configured');
      }

      const event = await this.client.webhooks.constructEventAsync(
        rawBody,
        signature,
        this.configs.signingSecret
      );

      if (event.livemode !== /^(sk|rk)_live_/.test(this.configs.secretKey)) {
        throw new Error('Stripe event environment mismatch');
      }
      let paymentSession: PaymentSession | undefined = undefined;

      const eventType = this.mapStripeEventType(event.type);

      if (eventType === PaymentEventType.CHECKOUT_SUCCESS) {
        paymentSession = await this.buildPaymentSessionFromCheckoutSession(
          event.data.object as Stripe.Response<Stripe.Checkout.Session>
        );
      } else if (
        eventType === PaymentEventType.PAYMENT_FAILED &&
        event.type.startsWith('checkout.session.')
      ) {
        paymentSession = await this.buildPaymentSessionFromCheckoutSession(
          event.data.object as Stripe.Response<Stripe.Checkout.Session>
        );
        paymentSession.paymentStatus =
          event.type === 'checkout.session.expired'
            ? PaymentStatus.CANCELED
            : PaymentStatus.FAILED;
      } else if (
        eventType === PaymentEventType.PAYMENT_SUCCESS ||
        eventType === PaymentEventType.PAYMENT_FAILED
      ) {
        paymentSession = await this.buildPaymentSessionFromInvoice(
          event.data.object as Stripe.Response<Stripe.Invoice>
        );
      } else if (eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
        paymentSession = await this.buildPaymentSessionFromSubscription(
          await this.client.subscriptions.retrieve(
            (event.data.object as Stripe.Subscription).id
          )
        );
      } else if (eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
        paymentSession = await this.buildPaymentSessionFromSubscription(
          await this.client.subscriptions.retrieve(
            (event.data.object as Stripe.Subscription).id
          )
        );
      }

      if (!paymentSession) {
        throw new Error('Invalid webhook event');
      }

      return {
        eventType: eventType,
        eventResult: event,
        paymentSession: paymentSession,
      };
    } catch (error) {
      throw error;
    }
  }

  async getPaymentInvoice({
    invoiceId,
  }: {
    invoiceId: string;
  }): Promise<PaymentInvoice> {
    try {
      const invoice = await this.client.invoices.retrieve(invoiceId);
      if (!invoice.id) {
        throw new Error('Invoice not found');
      }

      return {
        invoiceId: invoice.id,
        invoiceUrl: invoice.hosted_invoice_url || undefined,
        amount: invoice.amount_paid,
        currency: invoice.currency,
      };
    } catch (error) {
      throw error;
    }
  }

  async getPaymentBilling({
    customerId,
    returnUrl,
  }: {
    customerId: string;
    returnUrl?: string;
  }): Promise<PaymentBilling> {
    try {
      const billing = await this.client.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        configuration: this.configs.portalConfigurationId || undefined,
      });

      if (!billing.url) {
        throw new Error('get billing url failed');
      }

      return {
        billingUrl: billing.url,
      };
    } catch (error) {
      throw error;
    }
  }

  async cancelSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    try {
      if (!subscriptionId) {
        throw new Error('subscriptionId is required');
      }

      const subscription = await this.client.subscriptions.update(
        subscriptionId,
        { cancel_at_period_end: true }
      );

      if (!subscription.cancel_at_period_end) {
        throw new Error('Cancel subscription failed');
      }

      return await this.buildPaymentSessionFromSubscription(subscription);
    } catch (error) {
      throw error;
    }
  }

  private mapStripeEventType(eventType: string): PaymentEventType {
    switch (eventType) {
      case 'checkout.session.async_payment_succeeded':
      case 'checkout.session.completed':
        return PaymentEventType.CHECKOUT_SUCCESS;
      case 'invoice.payment_succeeded':
        return PaymentEventType.PAYMENT_SUCCESS;
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
      case 'invoice.payment_failed':
        return PaymentEventType.PAYMENT_FAILED;
      case 'customer.subscription.updated':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'customer.subscription.deleted':
        return PaymentEventType.SUBSCRIBE_CANCELED;
      default:
        throw new Error(`Unknown Stripe event type: ${eventType}`);
    }
  }

  private mapStripeStatus(
    session: Stripe.Response<Stripe.Checkout.Session>
  ): PaymentStatus {
    switch (session.status) {
      case 'complete':
        // session complete, check payment status
        switch (session.payment_status) {
          case 'paid':
            // payment success
            return PaymentStatus.SUCCESS;
          case 'unpaid':
            // payment failed
            return PaymentStatus.PROCESSING;
          case 'no_payment_required':
            // means payment not required, should be success
            return PaymentStatus.SUCCESS;
          default:
            throw new Error(
              `Unknown Stripe payment status: ${session.payment_status}`
            );
        }
      case 'expired':
        // payment canceled
        return PaymentStatus.CANCELED;
      case 'open':
        return PaymentStatus.PROCESSING;
      default:
        throw new Error(`Unknown Stripe status: ${session.status}`);
    }
  }

  // build payment session from checkout session
  private async buildPaymentSessionFromCheckoutSession(
    session: Stripe.Response<Stripe.Checkout.Session>
  ): Promise<PaymentSession> {
    let subscription: Stripe.Response<Stripe.Subscription> | undefined =
      undefined;
    let billingUrl = '';

    if (session.subscription) {
      subscription = await this.client.subscriptions.retrieve(
        session.subscription as string
      );
    }

    const result: PaymentSession = {
      provider: this.name,
      paymentStatus: this.mapStripeStatus(session),
      paymentInfo: {
        transactionId: session.id,
        discountCode: session.discounts?.find(
          (discount) => discount.promotion_code
        )?.promotion_code as string,
        discountAmount: session.total_details?.amount_discount || 0,
        discountCurrency: session.currency || '',
        paymentAmount: session.amount_total || 0,
        paymentCurrency: session.currency || '',
        paymentEmail:
          session.customer_email ||
          session.customer_details?.email ||
          undefined,
        paymentUserName: session.customer_details?.name || '',
        paymentUserId: session.customer
          ? (session.customer as string)
          : undefined,
        paidAt: session.created ? new Date(session.created * 1000) : undefined,
        invoiceId: session.invoice ? (session.invoice as string) : undefined,
        invoiceUrl: '',
      },
      paymentResult: session,
      metadata: session.metadata,
    };

    if (subscription) {
      if (
        subscription.status === 'trialing' &&
        !subscription.default_payment_method
      ) {
        throw new Error(
          'Trial payment method has not been confirmed by Stripe.'
        );
      }
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(subscription);
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build payment session from invoice
  private async buildPaymentSessionFromInvoice(
    invoice: Stripe.Response<Stripe.Invoice>
  ): Promise<PaymentSession> {
    let subscription: Stripe.Response<Stripe.Subscription> | undefined =
      undefined;
    let billingUrl = '';

    if (invoice.lines.data.length > 0) {
      const data = invoice.lines.data[0];
      let subscriptionId = '';

      // get subscription id from invoice line data
      if (data.subscription) {
        subscriptionId = data.subscription as string;
      } else if (
        data.parent &&
        data.parent.subscription_item_details &&
        data.parent.subscription_item_details.subscription
      ) {
        subscriptionId = data.parent.subscription_item_details
          .subscription as string;
      }

      if (subscriptionId) {
        subscription = await this.client.subscriptions.retrieve(subscriptionId);
      }
    }

    const result: PaymentSession = {
      provider: this.name,

      paymentStatus:
        invoice.status === 'paid'
          ? PaymentStatus.SUCCESS
          : PaymentStatus.FAILED,
      paymentInfo: {
        transactionId: invoice.id,
        discountCode: '',
        discountAmount:
          invoice.total_discount_amounts &&
          invoice.total_discount_amounts.length > 0
            ? invoice.total_discount_amounts[0].amount
            : 0,
        discountCurrency: invoice.currency || '',
        paymentAmount: invoice.amount_paid,
        paymentCurrency: invoice.currency,
        paymentEmail: invoice.customer_email || '',
        paymentUserName: invoice.customer_name || '',
        paymentUserId: invoice.customer
          ? (invoice.customer as string)
          : undefined,
        paidAt: invoice.created ? new Date(invoice.created * 1000) : undefined,
        invoiceId: invoice.id,
        invoiceUrl: invoice.hosted_invoice_url || '',
        subscriptionCycleType:
          invoice.billing_reason === 'subscription_create'
            ? SubscriptionCycleType.CREATE
            : invoice.billing_reason === 'subscription_cycle' ||
                invoice.billing_reason === 'subscription_update'
              ? SubscriptionCycleType.RENEWAL
              : undefined,
      },
      paymentResult: invoice,
      metadata: invoice.metadata,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(subscription);
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build payment session from invoice
  private async buildPaymentSessionFromSubscription(
    subscription: Stripe.Response<Stripe.Subscription>
  ): Promise<PaymentSession> {
    const result: PaymentSession = {
      provider: this.name,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(subscription);
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build subscription info from subscription
  private async buildSubscriptionInfo(
    subscription: Stripe.Response<Stripe.Subscription>
  ): Promise<SubscriptionInfo> {
    // subscription data
    const data = subscription.items.data[0];

    const subscriptionInfo: SubscriptionInfo = {
      subscriptionId: subscription.id,
      productId: data.price.product as string,
      planId: data.price.id,
      description: '',
      amount: data.price.unit_amount || 0,
      currency: data.price.currency,
      currentPeriodStart: new Date(data.current_period_start * 1000),
      currentPeriodEnd: new Date(data.current_period_end * 1000),
      trialPeriodDays:
        subscription.trial_start && subscription.trial_end
          ? Math.round(
              (subscription.trial_end - subscription.trial_start) / 86400
            )
          : 0,
      interval: data.plan.interval as PaymentInterval,
      intervalCount: data.plan.interval_count || 1,
      metadata: subscription.metadata,
    };

    // The trial grants access only until trial_end, never an unpaid annual period.
    if (subscription.status === 'trialing' && subscription.trial_end) {
      subscriptionInfo.currentPeriodStart = new Date(
        (subscription.trial_start || data.current_period_start) * 1000
      );
      subscriptionInfo.currentPeriodEnd = new Date(
        subscription.trial_end * 1000
      );
    }

    if (
      subscription.status === 'active' ||
      subscription.status === 'trialing'
    ) {
      if (subscription.cancel_at || subscription.cancel_at_period_end) {
        subscriptionInfo.status = SubscriptionStatus.PENDING_CANCEL;
        // cancel apply at
        subscriptionInfo.canceledAt = new Date(
          (subscription.canceled_at || 0) * 1000
        );
        // cancel end date
        subscriptionInfo.canceledEndAt = new Date(
          (subscription.cancel_at || data.current_period_end) * 1000
        );
        subscriptionInfo.canceledReason =
          subscription.cancellation_details?.comment || '';
        subscriptionInfo.canceledReasonType =
          subscription.cancellation_details?.feedback || '';
      } else {
        subscriptionInfo.status =
          subscription.status === 'trialing'
            ? SubscriptionStatus.TRIALING
            : SubscriptionStatus.ACTIVE;
      }
    } else if (subscription.status === 'canceled') {
      // subscription canceled
      subscriptionInfo.status = SubscriptionStatus.CANCELED;
      subscriptionInfo.canceledAt = new Date(
        (subscription.canceled_at || 0) * 1000
      );
      subscriptionInfo.canceledReason =
        subscription.cancellation_details?.comment || '';
      subscriptionInfo.canceledReasonType =
        subscription.cancellation_details?.feedback || '';
    } else if (
      ['past_due', 'unpaid', 'paused', 'incomplete'].includes(
        subscription.status
      )
    ) {
      subscriptionInfo.status = SubscriptionStatus.PAUSED;
    } else if (subscription.status === 'incomplete_expired') {
      subscriptionInfo.status = SubscriptionStatus.EXPIRED;
    } else {
      throw new Error(
        `Unknown Stripe subscription status: ${subscription.status}`
      );
    }

    return subscriptionInfo;
  }
}

/**
 * Create Stripe provider with configs
 */
export function createStripeProvider(configs: StripeConfigs): StripeProvider {
  return new StripeProvider(configs);
}
