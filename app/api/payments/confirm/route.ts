import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { confirmPayment } from '@/lib/payment-service';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent ID required' }, { status: 400 });
    }

    // Verify the payment belongs to the user
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('student_id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (paymentError || payment?.student_id !== user.id) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Confirm payment
    const success = await confirmPayment(paymentIntentId);

    if (!success) {
      return NextResponse.json({ error: 'Payment confirmation failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}