import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createLecturerPayout } from '@/lib/payment-service';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const body = await request.json();
    const { lecturerId, paymentId } = body;

    if (!lecturerId || !paymentId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify the payment exists and is completed
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        requests (
          lecturer_ids,
          status
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Verify lecturer is assigned to the request
    if (!payment.requests?.lecturer_ids?.includes(lecturerId)) {
      return NextResponse.json({ error: 'Lecturer not assigned to this request' }, { status: 403 });
    }

    // Check if payout already exists
    const { data: existingPayout, error: payoutCheckError } = await supabase
      .from('payouts')
      .select('id')
      .eq('lecturer_id', lecturerId)
      .eq('payment_id', paymentId)
      .single();

    if (existingPayout) {
      return NextResponse.json({ error: 'Payout already exists for this payment' }, { status: 400 });
    }

    // Create the payout
    const result = await createLecturerPayout(lecturerId, paymentId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payout trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger payout' },
      { status: 500 }
    );
  }
}

// This endpoint can be called when a letter is completed
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get completed letter and associated payment
    const { data: letter, error: letterError } = await supabase
      .from('letters')
      .select(`
        *,
        requests (
          payment_id,
          lecturer_ids
        )
      `)
      .eq('request_id', requestId)
      .eq('declaration_completed', true)
      .single();

    if (letterError || !letter) {
      return NextResponse.json({ error: 'Completed letter not found' }, { status: 404 });
    }

    const paymentId = letter.requests?.payment_id;
    if (!paymentId) {
      return NextResponse.json({ error: 'No payment associated with this request' }, { status: 400 });
    }

    // Trigger payout for the lecturer
    const result = await createLecturerPayout(letter.lecturer_id, paymentId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Payout triggered successfully' });
  } catch (error) {
    console.error('Auto payout trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger automatic payout' },
      { status: 500 }
    );
  }
}