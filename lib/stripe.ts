import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

export { stripe };

export const PAYMENT_AMOUNT = 30; // $30 per request
export const LECTURER_PERCENTAGE = 0.75; // 75% to lecturer
export const PLATFORM_PERCENTAGE = 0.25; // 25% to platform

export async function createPaymentIntent(
  amount: number,
  metadata: {
    studentId: string;
    requestId: string;
    lecturerIds: string[];
  }
) {
  return await stripe.paymentIntents.create({
    amount: amount * 100, // Convert to cents
    currency: 'usd',
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      student_id: metadata.studentId,
      request_id: metadata.requestId,
      lecturer_ids: metadata.lecturerIds.join(','),
    },
  });
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  return await stripe.paymentIntents.retrieve(paymentIntentId);
}

export async function cancelPaymentIntent(paymentIntentId: string) {
  return await stripe.paymentIntents.cancel(paymentIntentId);
}

export async function createRefund(
  chargeId: string,
  amount?: number,
  reason?: string
) {
  return await stripe.refunds.create({
    charge: chargeId,
    amount: amount ? amount * 100 : undefined, // Convert to cents if specified
    reason: reason as Stripe.RefundCreateParams.Reason,
  });
}

export async function createTransfer(
  amount: number,
  destination: string,
  metadata: {
    lecturerId: string;
    paymentId: string;
    requestId: string;
  }
) {
  return await stripe.transfers.create({
    amount: amount * 100, // Convert to cents
    currency: 'usd',
    destination,
    metadata: {
      lecturer_id: metadata.lecturerId,
      payment_id: metadata.paymentId,
      request_id: metadata.requestId,
    },
  });
}

export async function createConnectedAccount(
  email: string,
  country: string = 'US'
) {
  return await stripe.accounts.create({
    type: 'express',
    country,
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) {
  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
}