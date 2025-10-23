import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { createLecturerPayout } from '@/lib/payment-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'transfer.created':
        await handleTransferCreated(event.data.object);
        break;
      
      case 'transfer.paid':
        await handleTransferPaid(event.data.object);
        break;
      
      case 'transfer.failed':
        await handleTransferFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSucceeded(paymentIntent: any) {
  try {
    // Update payment status
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        stripe_charge_id: paymentIntent.latest_charge,
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (paymentError) {
      console.error('Failed to update payment status:', paymentError);
      return;
    }

    // Get payment details to update request
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('request_id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (fetchError || !payment) {
      console.error('Failed to fetch payment details:', fetchError);
      return;
    }

    // Update request with payment ID
    await supabase
      .from('requests')
      .update({ payment_id: payment.request_id })
      .eq('id', payment.request_id);

    // Send notification to lecturers about new paid request
    const lecturerIds = paymentIntent.metadata.lecturer_ids?.split(',') || [];
    for (const lecturerId of lecturerIds) {
      await supabase
        .from('notifications')
        .insert({
          user_id: lecturerId,
          type: 'new_request',
          title: 'New Paid Request',
          message: 'You have received a new paid recommendation letter request.',
          data: {
            request_id: payment.request_id,
            payment_id: payment.request_id,
          },
        });
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  try {
    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    // Optionally notify student about payment failure
    const studentId = paymentIntent.metadata.student_id;
    if (studentId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: studentId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again.',
          data: {
            payment_intent_id: paymentIntent.id,
          },
        });
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

async function handleTransferCreated(transfer: any) {
  try {
    // Update payout status
    await supabase
      .from('payouts')
      .update({
        status: 'processing',
      })
      .eq('stripe_transfer_id', transfer.id);
  } catch (error) {
    console.error('Error handling transfer created:', error);
  }
}

async function handleTransferPaid(transfer: any) {
  try {
    // Update payout status
    await supabase
      .from('payouts')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString(),
      })
      .eq('stripe_transfer_id', transfer.id);

    // Notify lecturer about successful payout
    const lecturerId = transfer.metadata.lecturer_id;
    if (lecturerId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: lecturerId,
          type: 'payout_completed',
          title: 'Payment Received',
          message: `Your payout of $${(transfer.amount / 100).toFixed(2)} has been processed.`,
          data: {
            transfer_id: transfer.id,
            amount: transfer.amount / 100,
          },
        });
    }
  } catch (error) {
    console.error('Error handling transfer paid:', error);
  }
}

async function handleTransferFailed(transfer: any) {
  try {
    // Update payout status
    await supabase
      .from('payouts')
      .update({
        status: 'failed',
        failure_reason: transfer.failure_message || 'Transfer failed',
      })
      .eq('stripe_transfer_id', transfer.id);

    // Notify lecturer about failed payout
    const lecturerId = transfer.metadata.lecturer_id;
    if (lecturerId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: lecturerId,
          type: 'payout_failed',
          title: 'Payment Failed',
          message: 'There was an issue processing your payout. Please contact support.',
          data: {
            transfer_id: transfer.id,
            failure_reason: transfer.failure_message,
          },
        });
    }
  } catch (error) {
    console.error('Error handling transfer failed:', error);
  }
}