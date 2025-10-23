import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { tokenIds } = body;

    if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
      return NextResponse.json({ 
        error: 'Token IDs array is required' 
      }, { status: 400 });
    }

    // Get tokens to be revoked (only unused ones)
    const { data: tokens, error: fetchError } = await supabase
      .from('tokens')
      .select('*')
      .in('id', tokenIds)
      .is('used_by', null);

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch tokens' 
      }, { status: 500 });
    }

    if (tokens.length === 0) {
      return NextResponse.json({ 
        error: 'No unused tokens found with provided IDs' 
      }, { status: 404 });
    }

    // Set expiry date to yesterday to effectively revoke them
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const revokeDate = yesterday.toISOString().split('T')[0];

    const { error: updateError } = await supabase
      .from('tokens')
      .update({ expiry_date: revokeDate })
      .in('id', tokens.map(t => t.id));

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to revoke tokens' 
      }, { status: 500 });
    }

    // Log the token revocation
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'revoke_tokens',
        resource_type: 'tokens',
        old_values: {
          tokens: tokens.map(t => ({ id: t.id, code: t.code, expiry_date: t.expiry_date })),
        },
        new_values: {
          revoked_count: tokens.length,
          new_expiry_date: revokeDate,
        },
      });

    return NextResponse.json({
      success: true,
      revokedCount: tokens.length,
      message: `Successfully revoked ${tokens.length} token(s)`,
    });
  } catch (error) {
    console.error('Token revocation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}