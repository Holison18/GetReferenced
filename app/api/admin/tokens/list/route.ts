import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'available', 'used', 'expired', 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('tokens')
      .select(`
        *,
        created_by_profile:profiles!tokens_created_by_fkey(first_name, last_name),
        used_by_profile:profiles!tokens_used_by_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    const now = new Date().toISOString().split('T')[0];
    
    switch (status) {
      case 'available':
        query = query
          .is('used_by', null)
          .gte('expiry_date', now);
        break;
      case 'used':
        query = query.not('used_by', 'is', null);
        break;
      case 'expired':
        query = query
          .is('used_by', null)
          .lt('expiry_date', now);
        break;
      // 'all' or default - no additional filters
    }

    const { data: tokens, error: tokensError } = await query;

    if (tokensError) {
      throw new Error('Failed to fetch tokens');
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true });

    switch (status) {
      case 'available':
        countQuery = countQuery
          .is('used_by', null)
          .gte('expiry_date', now);
        break;
      case 'used':
        countQuery = countQuery.not('used_by', 'is', null);
        break;
      case 'expired':
        countQuery = countQuery
          .is('used_by', null)
          .lt('expiry_date', now);
        break;
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw new Error('Failed to get token count');
    }

    // Calculate statistics
    const { data: stats, error: statsError } = await supabase
      .from('tokens')
      .select('used_by, expiry_date, value');

    if (statsError) {
      throw new Error('Failed to get token statistics');
    }

    const totalTokens = stats?.length || 0;
    const usedTokens = stats?.filter(t => t.used_by).length || 0;
    const expiredTokens = stats?.filter(t => !t.used_by && t.expiry_date < now).length || 0;
    const availableTokens = totalTokens - usedTokens - expiredTokens;
    const totalValue = stats?.reduce((sum, t) => sum + (t.used_by ? t.value : 0), 0) || 0;

    return NextResponse.json({
      tokens,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      statistics: {
        total: totalTokens,
        available: availableTokens,
        used: usedTokens,
        expired: expiredTokens,
        totalValueUsed: totalValue,
      },
    });
  } catch (error) {
    console.error('Token list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}