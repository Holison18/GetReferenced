import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ 
        error: 'Token code is required' 
      }, { status: 400 });
    }

    // Find and validate token
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (tokenError || !token) {
      return NextResponse.json({ 
        error: 'Invalid token code',
        valid: false 
      }, { status: 404 });
    }

    // Check if token is already used
    if (token.used_by) {
      return NextResponse.json({ 
        error: 'Token has already been used',
        valid: false 
      }, { status: 400 });
    }

    // Check if token is expired
    const now = new Date();
    const expiryDate = new Date(token.expiry_date);
    if (expiryDate < now) {
      return NextResponse.json({ 
        error: 'Token has expired',
        valid: false 
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      token: {
        id: token.id,
        code: token.code,
        value: token.value,
        expiryDate: token.expiry_date,
      },
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}