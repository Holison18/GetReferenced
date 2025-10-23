import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/twilio';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    // Update request status in Supabase
    await supabase.from('payments').update({ status: 'paid' }).eq('stripe_id', paymentIntent.id);
    // Notify lecturer
    await sendNotification('lecturer_phone', 'New request paid', 'sms');
  }

  return NextResponse.json({ received: true });
}