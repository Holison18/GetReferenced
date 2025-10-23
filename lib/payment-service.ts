import { createClient } from '@supabase/supabase-js';
import { 
  stripe, 
  createPaymentIntent, 
  createRefund, 
  createTransfer,
  PAYMENT_AMOUNT,
  LECTURER_PERCENTAGE,
  PLATFORM_PERCENTAGE 
} from './stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface PaymentData {
  studentId: string;
  requestId: string;
  lecturerIds: string[];
  tokenCode?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  clientSecret?: string;
  error?: string;
}

export async function initiatePayment(data: PaymentData): Promise<PaymentResult> {
  try {
    let finalAmount = PAYMENT_AMOUNT;
    let tokenUsed = null;

    // Check if token is provided and valid
    if (data.tokenCode) {
      const { data: token, error: tokenError } = await supabase
        .from('tokens')
        .select('*')
        .eq('code', data.tokenCode)
        .is('used_by', null)
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .single();

      if (tokenError || !token) {
        return { success: false, error: 'Invalid or expired token' };
      }

      if (token.value >= 1) {
        finalAmount = 0; // Free request
        tokenUsed = token.id;
      }
    }

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        student_id: data.studentId,
        request_id: data.requestId,
        amount: finalAmount,
        currency: 'usd',
        status: finalAmount === 0 ? 'succeeded' : 'pending',
        token_used: tokenUsed,
      })
      .select()
      .single();

    if (paymentError) {
      return { success: false, error: 'Failed to create payment record' };
    }

    // If using token, mark it as used and return success
    if (finalAmount === 0 && tokenUsed) {
      await supabase
        .from('tokens')
        .update({
          used_by: data.studentId,
          used_date: new Date().toISOString(),
        })
        .eq('id', tokenUsed);

      // Update request with payment ID
      await supabase
        .from('requests')
        .update({ payment_id: payment.id })
        .eq('id', data.requestId);

      return { 
        success: true, 
        paymentId: payment.id,
        clientSecret: 'token_used' 
      };
    }

    // Create Stripe payment intent for paid requests
    const paymentIntent = await createPaymentIntent(finalAmount, {
      studentId: data.studentId,
      requestId: data.requestId,
      lecturerIds: data.lecturerIds,
    });

    // Update payment record with Stripe payment intent ID
    await supabase
      .from('payments')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
      })
      .eq('id', payment.id);

    return {
      success: true,
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret!,
    };
  } catch (error) {
    console.error('Payment initiation error:', error);
    return { success: false, error: 'Payment processing failed' };
  }
}

export async function confirmPayment(paymentIntentId: string): Promise<boolean> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      // Update payment status in database
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'succeeded',
          stripe_charge_id: paymentIntent.latest_charge as string,
          receipt_url: paymentIntent.charges?.data[0]?.receipt_url,
        })
        .eq('stripe_payment_intent_id', paymentIntentId);

      if (error) {
        console.error('Failed to update payment status:', error);
        return false;
      }

      // Update request status
      const { data: payment } = await supabase
        .from('payments')
        .select('request_id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (payment) {
        await supabase
          .from('requests')
          .update({ payment_id: payment.request_id })
          .eq('id', payment.request_id);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return false;
  }
}

export async function processRefund(
  paymentId: string, 
  reason: string,
  amount?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return { success: false, error: 'Payment not found' };
    }

    if (payment.status !== 'succeeded') {
      return { success: false, error: 'Payment not eligible for refund' };
    }

    // Process refund with Stripe
    const refund = await createRefund(
      payment.stripe_charge_id,
      amount,
      reason
    );

    // Update payment record
    await supabase
      .from('payments')
      .update({
        status: 'refunded',
        refund_id: refund.id,
        refund_amount: (refund.amount || payment.amount * 100) / 100,
        refund_reason: reason,
      })
      .eq('id', paymentId);

    return { success: true };
  } catch (error) {
    console.error('Refund processing error:', error);
    return { success: false, error: 'Refund processing failed' };
  }
}

export async function createLecturerPayout(
  lecturerId: string,
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return { success: false, error: 'Payment not found' };
    }

    if (payment.status !== 'succeeded') {
      return { success: false, error: 'Payment not completed' };
    }

    // Calculate lecturer payout amount
    const payoutAmount = payment.amount * LECTURER_PERCENTAGE;

    // Get lecturer's Stripe account ID
    const { data: lecturer, error: lecturerError } = await supabase
      .from('lecturer_profiles')
      .select('payment_details')
      .eq('id', lecturerId)
      .single();

    if (lecturerError || !lecturer?.payment_details?.stripe_account_id) {
      return { success: false, error: 'Lecturer payment details not configured' };
    }

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        lecturer_id: lecturerId,
        payment_id: paymentId,
        amount: payoutAmount,
        currency: 'usd',
        status: 'pending',
        stripe_account_id: lecturer.payment_details.stripe_account_id,
        scheduled_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (payoutError) {
      return { success: false, error: 'Failed to create payout record' };
    }

    // Create Stripe transfer
    const transfer = await createTransfer(
      payoutAmount,
      lecturer.payment_details.stripe_account_id,
      {
        lecturerId,
        paymentId,
        requestId: payment.request_id,
      }
    );

    // Update payout record with transfer ID
    await supabase
      .from('payouts')
      .update({
        stripe_transfer_id: transfer.id,
        status: 'processing',
      })
      .eq('id', payout.id);

    return { success: true };
  } catch (error) {
    console.error('Payout creation error:', error);
    return { success: false, error: 'Payout processing failed' };
  }
}

export async function getPaymentHistory(
  userId: string,
  role: 'student' | 'lecturer'
): Promise<any[]> {
  try {
    if (role === 'student') {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          requests (
            id,
            purpose,
            status,
            deadline
          )
        `)
        .eq('student_id', userId)
        .order('created_at', { ascending: false });

      return error ? [] : data;
    } else {
      const { data, error } = await supabase
        .from('payouts')
        .select(`
          *,
          payments (
            amount,
            currency,
            requests (
              id,
              purpose,
              student_id
            )
          )
        `)
        .eq('lecturer_id', userId)
        .order('created_at', { ascending: false });

      return error ? [] : data;
    }
  } catch (error) {
    console.error('Payment history error:', error);
    return [];
  }
}