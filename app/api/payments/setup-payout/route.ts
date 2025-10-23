import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createConnectedAccount, createAccountLink } from '@/lib/stripe';

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

    // Verify user is a lecturer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'lecturer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if lecturer already has payment setup
    const { data: lecturerProfile, error: lecturerError } = await supabase
      .from('lecturer_profiles')
      .select('payment_details')
      .eq('id', user.id)
      .single();

    if (lecturerError) {
      return NextResponse.json({ error: 'Lecturer profile not found' }, { status: 404 });
    }

    let accountId = lecturerProfile.payment_details?.stripe_account_id;

    // Create Stripe connected account if not exists
    if (!accountId) {
      const account = await createConnectedAccount(profile.email);
      accountId = account.id;

      // Update lecturer profile with account ID
      await supabase
        .from('lecturer_profiles')
        .update({
          payment_details: {
            ...lecturerProfile.payment_details,
            stripe_account_id: accountId,
          },
        })
        .eq('id', user.id);
    }

    // Create account link for onboarding
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const accountLink = await createAccountLink(
      accountId,
      `${baseUrl}/lecturer/dashboard?setup=refresh`,
      `${baseUrl}/lecturer/dashboard?setup=complete`
    );

    return NextResponse.json({
      accountId,
      onboardingUrl: accountLink.url,
    });
  } catch (error) {
    console.error('Payout setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup payout account' },
      { status: 500 }
    );
  }
}