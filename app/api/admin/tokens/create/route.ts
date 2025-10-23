import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

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
    const { value, expiryDate, quantity = 1, prefix = 'GET' } = body;

    if (!value || !expiryDate) {
      return NextResponse.json({ 
        error: 'Value and expiry date are required' 
      }, { status: 400 });
    }

    if (value < 1 || value > 10) {
      return NextResponse.json({ 
        error: 'Token value must be between 1 and 10' 
      }, { status: 400 });
    }

    if (quantity < 1 || quantity > 100) {
      return NextResponse.json({ 
        error: 'Quantity must be between 1 and 100' 
      }, { status: 400 });
    }

    // Validate expiry date
    const expiry = new Date(expiryDate);
    const now = new Date();
    if (expiry <= now) {
      return NextResponse.json({ 
        error: 'Expiry date must be in the future' 
      }, { status: 400 });
    }

    // Generate tokens
    const tokens = [];
    for (let i = 0; i < quantity; i++) {
      const code = `${prefix}-${nanoid(8).toUpperCase()}`;
      tokens.push({
        code,
        value: Number(value),
        expiry_date: expiryDate,
        created_by: user.id,
      });
    }

    // Insert tokens into database
    const { data: createdTokens, error: insertError } = await supabase
      .from('tokens')
      .insert(tokens)
      .select();

    if (insertError) {
      console.error('Token creation error:', insertError);
      return NextResponse.json({ 
        error: 'Failed to create tokens' 
      }, { status: 500 });
    }

    // Log the token creation
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'create_tokens',
        resource_type: 'tokens',
        new_values: {
          quantity,
          value,
          expiry_date: expiryDate,
          codes: createdTokens?.map(t => t.code),
        },
      });

    return NextResponse.json({
      success: true,
      tokens: createdTokens,
      message: `Successfully created ${quantity} token(s)`,
    });
  } catch (error) {
    console.error('Token creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}