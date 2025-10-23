import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth'
import { requirePermission } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('admin', 'read')
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'all'
    
    const supabase = createServerSupabaseClient()
    
    let query = supabase
      .from('tokens')
      .select(`
        *,
        created_by_profile:profiles!tokens_created_by_fkey(first_name, last_name),
        used_by_profile:profiles!tokens_used_by_fkey(first_name, last_name)
      `)
    
    // Apply status filter
    if (status === 'active') {
      query = query.is('used_by', null).gt('expiry_date', new Date().toISOString())
    } else if (status === 'used') {
      query = query.not('used_by', 'is', null)
    } else if (status === 'expired') {
      query = query.is('used_by', null).lt('expiry_date', new Date().toISOString())
    }
    
    // Get total count
    const { count } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true })
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data: tokens, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      tokens: tokens || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userWithProfile = await requirePermission('admin', 'write')
    
    const body = await request.json()
    const { value, expiryDate, quantity = 1 } = body
    
    if (!value || !expiryDate) {
      return NextResponse.json(
        { error: 'Value and expiry date are required' },
        { status: 400 }
      )
    }
    
    const supabase = createServerSupabaseClient()
    
    // Generate tokens
    const tokens = []
    for (let i = 0; i < quantity; i++) {
      const code = generateTokenCode()
      tokens.push({
        code,
        value,
        expiry_date: expiryDate,
        created_by: userWithProfile.user.id
      })
    }
    
    const { data: createdTokens, error } = await supabase
      .from('tokens')
      .insert(tokens)
      .select()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ 
      tokens: createdTokens,
      message: `${quantity} token(s) created successfully`
    })
  } catch (error) {
    console.error('Error creating tokens:', error)
    return NextResponse.json(
      { error: 'Failed to create tokens' },
      { status: 500 }
    )
  }
}

function generateTokenCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}