import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { initiatePayment } from '@/lib/payment-service';

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

    // Verify user is a student
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'student') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, lecturerIds, tokenCode } = body;

    if (!requestId || !lecturerIds || !Array.isArray(lecturerIds)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Verify the request belongs to the user
    const { data: requestData, error: requestError } = await supabase
      .from('requests')
      .select('id, student_id')
      .eq('id', requestId)
      .eq('student_id', user.id)
      .single();

    if (requestError || !requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Initiate payment
    const result = await initiatePayment({
      studentId: user.id,
      requestId,
      lecturerIds,
      tokenCode,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      paymentId: result.paymentId,
      clientSecret: result.clientSecret,
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}