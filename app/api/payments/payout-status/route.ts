import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
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

    // Verify user is a lecturer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'lecturer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get lecturer's payment details
    const { data: lecturerProfile, error: lecturerError } = await supabase
      .from('lecturer_profiles')
      .select('payment_details')
      .eq('id', user.id)
      .single();

    if (lecturerError) {
      return NextResponse.json({ error: 'Lecturer profile not found' }, { status: 404 });
    }

    const accountId = lecturerProfile.payment_details?.stripe_account_id;

    if (!accountId) {
      return NextResponse.json({
        isSetup: false,
        canReceivePayouts: false,
      });
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(accountId);

    const isSetup = account.details_submitted;
    const canReceivePayouts = account.charges_enabled && account.payouts_enabled;

    return NextResponse.json({
      isSetup,
      canReceivePayouts,
      accountId,
      requirements: account.requirements,
    });
  } catch (error) {
    console.error('Payout status error:', error);
    return NextResponse.json(
      { error: 'Failed to check payout status' },
      { status: 500 }
    );
  }
}